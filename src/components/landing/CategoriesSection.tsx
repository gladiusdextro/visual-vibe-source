import { motion } from "framer-motion";
import { Palette, Image, Layout, Monitor, ShoppingBag, FileText, Megaphone, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Social Media", icon: Instagram, count: 250 },
  { name: "Marketing Digital", icon: Megaphone, count: 180 },
  { name: "Anúncios", icon: Monitor, count: 120 },
  { name: "Posts Instagram", icon: Image, count: 300 },
  { name: "Stories", icon: Layout, count: 200 },
  { name: "Banners", icon: FileText, count: 90 },
  { name: "E-commerce", icon: ShoppingBag, count: 75 },
  { name: "Mockups", icon: Palette, count: 150 },
];

const CategoriesSection = () => {
  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Explore por <span className="text-gradient">categoria</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Arquivos organizados para você encontrar exatamente o que precisa.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/biblioteca?cat=${cat.name.toLowerCase().replace(/ /g, "-")}`}
                className="group flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-gradient-card hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <cat.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-display font-semibold text-sm text-center">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count}+ arquivos</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
