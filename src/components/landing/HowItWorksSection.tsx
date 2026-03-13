import { motion } from "framer-motion";
import { Search, Download, Palette, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Encontre",
    description: "Navegue pela biblioteca e encontre o arquivo perfeito para seu projeto.",
  },
  {
    icon: Download,
    title: "Baixe",
    description: "Faça o download do arquivo editável no formato que precisar.",
  },
  {
    icon: Palette,
    title: "Edite",
    description: "Personalize cores, textos e elementos no seu editor favorito.",
  },
  {
    icon: Sparkles,
    title: "Publique",
    description: "Publique seu design profissional e impressione seu público.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Como <span className="text-gradient">funciona</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Em 4 passos simples, tenha designs profissionais prontos para usar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="bg-gradient-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-300 h-full">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary mb-2">PASSO {i + 1}</div>
                <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
