import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Crown, Clock, FileText, LogOut, Settings, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { toast } from "sonner";

interface Subscription {
  plan: string;
  status: string;
  downloads_used: number;
  downloads_limit: number;
  current_period_end: string;
}

interface DownloadRecord {
  id: string;
  downloaded_at: string;
  creative_files: {
    title: string;
    category: string;
    format: string;
  } | null;
}

const planNames: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  master: "Master",
};

const planColors: Record<string, string> = {
  starter: "bg-secondary text-secondary-foreground",
  pro: "bg-primary/20 text-primary",
  master: "bg-primary text-primary-foreground",
};

const Dashboard = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [subRes, dlRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
        supabase
          .from("download_history")
          .select("id, downloaded_at, creative_files(title, category, format)")
          .eq("user_id", user.id)
          .order("downloaded_at", { ascending: false })
          .limit(20),
      ]);
      if (subRes.data) setSubscription(subRes.data as any);
      if (dlRes.data) setDownloads(dlRes.data as any);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const downloadsRemaining = subscription
    ? subscription.downloads_limit < 0
      ? "∞"
      : subscription.downloads_limit - subscription.downloads_used
    : 0;

  const downloadsPercent = subscription
    ? subscription.downloads_limit < 0
      ? 100
      : Math.round((subscription.downloads_used / subscription.downloads_limit) * 100)
    : 0;

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display">Minha Conta</h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-1" /> Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-1" /> Sair
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Subscription Card */}
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-primary" />
                      <h2 className="font-display font-semibold text-lg">Seu Plano</h2>
                    </div>
                    {subscription ? (
                      <Badge className={planColors[subscription.plan]}>
                        {planNames[subscription.plan]}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Sem plano</Badge>
                    )}
                  </div>

                  {subscription ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Downloads usados</span>
                          <span className="font-medium">
                            {subscription.downloads_used} / {subscription.downloads_limit < 0 ? "∞" : subscription.downloads_limit}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary rounded-full transition-all"
                            style={{ width: `${Math.min(downloadsPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Renova em {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex gap-2">
                        <Link to="/planos">
                          <Button size="sm" variant="outline">Upgrade</Button>
                        </Link>
                        {subscription.status === "active" && !showCancelConfirm && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setShowCancelConfirm(true)}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Cancelar
                          </Button>
                        )}
                      </div>
                      {showCancelConfirm && (
                        <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                          <p className="text-sm text-foreground mb-3">
                            Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso ao final do período atual.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={cancelling}
                              onClick={async () => {
                                setCancelling(true);
                                try {
                                  const { error } = await supabase.functions.invoke("mercadopago-cancel");
                                  if (error) throw error;
                                  toast.success("Assinatura cancelada com sucesso.");
                                  setSubscription({ ...subscription, status: "cancelled" });
                                  setShowCancelConfirm(false);
                                } catch (err: any) {
                                  toast.error(err.message || "Erro ao cancelar. Tente novamente.");
                                } finally {
                                  setCancelling(false);
                                }
                              }}
                            >
                              {cancelling ? (
                                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Cancelando...</>
                              ) : (
                                "Confirmar cancelamento"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowCancelConfirm(false)}
                              disabled={cancelling}
                            >
                              Voltar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm mb-3">Você ainda não possui um plano ativo.</p>
                      <Link to="/planos">
                        <Button className="bg-gradient-primary text-primary-foreground">
                          Escolher um plano
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Downloads remaining */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border bg-gradient-card p-4 text-center">
                    <Download className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold font-display">{downloadsRemaining}</p>
                    <p className="text-xs text-muted-foreground">Downloads restantes</p>
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-card p-4 text-center">
                    <FileText className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold font-display">{downloads.length}</p>
                    <p className="text-xs text-muted-foreground">Total baixados</p>
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-card p-4 text-center">
                    <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold font-display">{subscription ? planNames[subscription.plan] : "—"}</p>
                    <p className="text-xs text-muted-foreground">Plano atual</p>
                  </div>
                </div>

                {/* Download History */}
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Histórico de Downloads
                  </h2>
                  {downloads.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum download realizado ainda.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {downloads.map((dl) => (
                        <div key={dl.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <div>
                            <p className="text-sm font-medium">{dl.creative_files?.title ?? "Arquivo removido"}</p>
                            <p className="text-xs text-muted-foreground">
                              {dl.creative_files?.category} • {dl.creative_files?.format}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(dl.downloaded_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
