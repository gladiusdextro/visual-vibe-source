import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const plans = [
  {
    name: "Starter",
    price: "24,90",
    id: "starter",
    icon: Zap,
    popular: false,
    features: [
      "Até 10 downloads por mês",
      "Acesso a arquivos básicos",
      "Formatos PSD, PNG, JPG",
      "Suporte por email",
    ],
  },
  {
    name: "Pro",
    price: "34,90",
    id: "pro",
    icon: Sparkles,
    popular: true,
    features: [
      "Até 17 downloads por mês",
      "Acesso à grande parte da biblioteca",
      "Todos os formatos disponíveis",
      "Novos arquivos semanais",
      "Suporte prioritário",
    ],
  },
  {
    name: "Master",
    price: "59,90",
    id: "master",
    icon: Crown,
    popular: false,
    features: [
      "Até 27 downloads por mês",
      "Acesso total à biblioteca",
      "Todos os arquivos premium",
      "Atualizações semanais",
      "Suporte VIP",
      "Acesso antecipado",
    ],
  },
];

const PricingSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
        body: { plan: planId },
      });

      if (error) throw error;

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("URL de pagamento não gerada");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="py-24 relative" id="planos">
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha seu <span className="text-gradient">plano</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Comece com o plano que mais combina com sua necessidade. Upgrade a qualquer momento.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-6 ${
                plan.popular
                  ? "border-primary bg-gradient-card shadow-glow"
                  : "border-border bg-gradient-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                  MAIS POPULAR
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  plan.popular ? "bg-primary/20" : "bg-secondary"
                }`}>
                  <plan.icon className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-sm text-muted-foreground">R$</span>
                <span className="text-4xl font-bold font-display">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-secondary-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full ${
                  plan.popular
                    ? "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processando...</>
                ) : (
                  `Assinar ${plan.name}`
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
