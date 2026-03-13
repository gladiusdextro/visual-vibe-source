import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Crown, Sparkles, Zap, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";

const planDetails: Record<string, { name: string; icon: any; downloads: number; price: string }> = {
  starter: { name: "Starter", icon: Zap, downloads: 10, price: "24,90" },
  pro: { name: "Pro", icon: Sparkles, downloads: 17, price: "34,90" },
  master: { name: "Master", icon: Crown, downloads: 27, price: "59,90" },
};

const PaymentSuccess = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      // Poll a few times since webhook may take a moment
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (data) {
          setSubscription(data);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const plan = subscription ? planDetails[subscription.plan] : null;
  const PlanIcon = plan?.icon || Crown;

  return (
    <Layout>
      <section className="py-16 min-h-[70vh] flex items-center">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Confirmando seu pagamento...</p>
              </div>
            ) : (
              <>
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl md:text-3xl font-bold font-display mb-3"
                >
                  Assinatura Ativada!
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-8"
                >
                  Seu pagamento foi confirmado com sucesso. Aproveite todos os recursos do seu plano!
                </motion.p>

                {/* Plan Details Card */}
                {plan && subscription && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-xl border border-border bg-gradient-card p-6 mb-8 text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <PlanIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-lg">CriaHub {plan.name}</h2>
                        <p className="text-sm text-muted-foreground">Assinatura mensal</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Valor mensal</span>
                        <span className="font-medium">R$ {plan.price}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Downloads por mês</span>
                        <span className="font-medium">{plan.downloads}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Próxima renovação</span>
                        <span className="font-medium">
                          {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium text-green-500">Ativo</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!plan && !loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-xl border border-border bg-gradient-card p-6 mb-8"
                  >
                    <p className="text-muted-foreground text-sm">
                      Seu pagamento está sendo processado. A assinatura será ativada em instantes.
                      Verifique seu dashboard para acompanhar.
                    </p>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                  <Link to="/biblioteca">
                    <Button className="bg-gradient-primary text-primary-foreground w-full sm:w-auto">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Explorar Biblioteca
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="outline" className="w-full sm:w-auto">
                      Ir para Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default PaymentSuccess;
