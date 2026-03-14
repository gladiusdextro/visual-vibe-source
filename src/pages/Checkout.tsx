import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, QrCode, Loader2, Copy, CheckCircle2, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";

const PLANS: Record<string, { name: string; price: string; priceNum: number }> = {
  starter: { name: "Starter", price: "24,90", priceNum: 24.9 },
  pro: { name: "Pro", price: "34,90", priceNum: 34.9 },
  master: { name: "Master", price: "59,90", priceNum: 59.9 },
};

const loadMPScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.MercadoPago) return resolve();
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago"));
    document.head.appendChild(s);
  });

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const planId = searchParams.get("plan") || "";
  const plan = PLANS[planId];

  const [tab, setTab] = useState("card");
  const [sdkReady, setSdkReady] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [pixPolling, setPixPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardFormRef = useRef<MercadoPagoCardForm | null>(null);
  const mpRef = useRef<MercadoPagoInstance | null>(null);
  const mountedRef = useRef(true);

  // Load SDK and fetch public key
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const init = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mercadopago-public-key");
        if (error || !data?.public_key) throw new Error("Chave pública não disponível");

        await loadMPScript();
        if (cancelled) return;

        mpRef.current = new window.MercadoPago(data.public_key, { locale: "pt-BR" });
        setSdkReady(true);
      } catch (err: any) {
        console.error("SDK init error:", err);
        toast.error("Erro ao inicializar pagamento");
      }
    };

    init();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  // Initialize card form when SDK ready and tab is card
  useEffect(() => {
    if (!sdkReady || !mpRef.current || tab !== "card" || !plan) return;

    // Small delay to ensure DOM elements are rendered
    const timeout = setTimeout(() => {
      try {
        cardFormRef.current = mpRef.current!.cardForm({
          amount: String(plan.priceNum),
          iframe: true,
          form: {
            id: "mp-card-form",
            cardNumber: { id: "mp-card-number", placeholder: "Número do cartão", style: { fontSize: "16px" } },
            expirationDate: { id: "mp-expiration", placeholder: "MM/AA", style: { fontSize: "16px" } },
            securityCode: { id: "mp-cvv", placeholder: "CVV", style: { fontSize: "16px" } },
            cardholderName: { id: "mp-cardholder", placeholder: "Nome como está no cartão" },
            issuer: { id: "mp-issuer", placeholder: "Banco emissor" },
            installments: { id: "mp-installments", placeholder: "Parcelas" },
            identificationType: { id: "mp-doc-type", placeholder: "Tipo de documento" },
            identificationNumber: { id: "mp-doc-number", placeholder: "Número do documento" },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) console.error("CardForm mount error:", error);
            },
            onSubmit: async (event: Event) => {
              event.preventDefault();
              if (!cardFormRef.current || cardLoading) return;

              setCardLoading(true);
              try {
                const formData = cardFormRef.current.getCardFormData();
                const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
                  body: {
                    plan: planId,
                    payment_type: "card",
                    token: formData.token,
                    installments: formData.installments,
                    issuer_id: formData.issuer_id,
                    payment_method_id: formData.payment_method_id,
                    payer: {
                      identification: formData.payer.identification,
                    },
                  },
                });

                if (error) throw error;

                if (data.status === "approved") {
                  navigate("/pagamento-sucesso");
                } else if (data.status === "in_process" || data.status === "pending") {
                  toast.info("Pagamento em análise. Você será notificado quando for aprovado.");
                  navigate("/pagamento-sucesso");
                } else {
                  toast.error(`Pagamento recusado: ${data.status_detail || data.status}`);
                }
              } catch (err: any) {
                console.error("Card payment error:", err);
                toast.error(err.message || "Erro ao processar pagamento");
              } finally {
                if (mountedRef.current) setCardLoading(false);
              }
            },
            onFetching: (resource: string) => {
              const progressBar = document.querySelector(".mp-progress");
              if (progressBar) progressBar.removeAttribute("value");
              return () => {
                if (progressBar) progressBar.setAttribute("value", "0");
              };
            },
          },
        });
      } catch (err) {
        console.error("CardForm init error:", err);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (cardFormRef.current) {
        try { cardFormRef.current.unmount(); } catch {}
        cardFormRef.current = null;
      }
    };
  }, [sdkReady, tab, plan, planId, navigate]);

  const handlePixPayment = useCallback(async () => {
    if (pixLoading) return;
    setPixLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
        body: { plan: planId, payment_type: "pix" },
      });

      if (error) throw error;

      if (data.qr_code && data.qr_code_base64) {
        setPixData({ qr_code: data.qr_code, qr_code_base64: data.qr_code_base64 });
        // Start polling for payment approval
        setPixPolling(true);
        pollPixPayment(data.payment_id);
      } else {
        throw new Error("QR Code não gerado");
      }
    } catch (err: any) {
      console.error("PIX error:", err);
      toast.error(err.message || "Erro ao gerar PIX");
    } finally {
      setPixLoading(false);
    }
  }, [planId, pixLoading]);

  const pollPixPayment = useCallback(async (paymentId: string) => {
    for (let i = 0; i < 60; i++) {
      if (!mountedRef.current) return;
      await new Promise((r) => setTimeout(r, 5000));

      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user?.id || "")
        .eq("status", "active")
        .maybeSingle();

      if (data) {
        navigate("/pagamento-sucesso");
        return;
      }
    }
    if (mountedRef.current) {
      setPixPolling(false);
      toast.info("O PIX expirou. Gere um novo código se necessário.");
    }
  }, [user, navigate]);

  const copyPixCode = useCallback(() => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  }, [pixData]);

  if (!plan) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Plano não encontrado</p>
            <Button variant="outline" onClick={() => navigate("/planos")}>
              Ver planos
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12 min-h-[70vh]">
        <div className="container mx-auto px-4 max-w-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/planos")}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar aos planos
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Plan summary */}
            <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plano selecionado</p>
                  <h2 className="font-display text-xl font-bold">CriaHub {plan.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className="text-2xl font-bold font-display">{plan.price}</span>
                </div>
              </div>
            </div>

            {/* Payment tabs */}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-6">
                <TabsTrigger value="card" className="gap-2">
                  <CreditCard className="w-4 h-4" /> Cartão
                </TabsTrigger>
                <TabsTrigger value="pix" className="gap-2">
                  <QrCode className="w-4 h-4" /> PIX
                </TabsTrigger>
              </TabsList>

              {/* ── CARD TAB ── */}
              <TabsContent value="card">
                {!sdkReady ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <form id="mp-card-form" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Número do cartão</label>
                      <div id="mp-card-number" className="h-12 rounded-lg border border-input bg-background px-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Validade</label>
                        <div id="mp-expiration" className="h-12 rounded-lg border border-input bg-background px-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">CVV</label>
                        <div id="mp-cvv" className="h-12 rounded-lg border border-input bg-background px-1" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Nome no cartão</label>
                      <input
                        id="mp-cardholder"
                        type="text"
                        className="w-full h-12 rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Documento</label>
                        <select
                          id="mp-doc-type"
                          className="w-full h-12 rounded-lg border border-input bg-background px-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Número</label>
                        <input
                          id="mp-doc-number"
                          type="text"
                          className="w-full h-12 rounded-lg border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="hidden">
                      <select id="mp-issuer" />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Parcelas</label>
                      <select
                        id="mp-installments"
                        className="w-full h-12 rounded-lg border border-input bg-background px-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <progress className="mp-progress w-full" value="0" />

                    <Button
                      type="submit"
                      disabled={cardLoading}
                      className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow text-base font-semibold"
                    >
                      {cardLoading ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processando...</>
                      ) : (
                        <>Pagar R$ {plan.price}</>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>

              {/* ── PIX TAB ── */}
              <TabsContent value="pix">
                {!pixData ? (
                  <div className="text-center py-8">
                    <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-6 text-sm">
                      Clique abaixo para gerar o QR Code PIX. Após o pagamento, seu plano será ativado automaticamente.
                    </p>
                    <Button
                      onClick={handlePixPayment}
                      disabled={pixLoading}
                      className="w-full h-12 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow text-base font-semibold"
                    >
                      {pixLoading ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Gerando PIX...</>
                      ) : (
                        <>Gerar PIX — R$ {plan.price}</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-5">
                    <div className="rounded-xl border border-border bg-card p-4 inline-block">
                      <img
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="w-56 h-56 mx-auto"
                      />
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Ou copie o código:</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={pixData.qr_code}
                          className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-foreground text-xs truncate"
                        />
                        <Button size="sm" variant="outline" onClick={copyPixCode} className="shrink-0">
                          {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {pixPolling && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Aguardando pagamento...
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              Pagamento seguro via Mercado Pago
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
