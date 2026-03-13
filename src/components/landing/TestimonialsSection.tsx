import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Mariana Silva",
    role: "Social Media Manager",
    text: "O CriaHub mudou minha rotina de trabalho. Consigo criar posts incríveis em minutos usando os templates prontos.",
    rating: 5,
  },
  {
    name: "Lucas Ferreira",
    role: "Designer Freelancer",
    text: "A qualidade dos arquivos é surreal. Economizo horas toda semana com os mockups e templates profissionais.",
    rating: 5,
  },
  {
    name: "Ana Costa",
    role: "Gestora de Tráfego",
    text: "Os criativos para anúncios são perfeitos. Meus clientes adoram a qualidade e velocidade de entrega.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O que nossos <span className="text-gradient">membros</span> dizem
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Milhares de profissionais já usam o CriaHub no dia a dia.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-card rounded-xl border border-border p-6 hover:border-primary/20 transition-colors"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-secondary-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
