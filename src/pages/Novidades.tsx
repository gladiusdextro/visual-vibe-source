import { motion } from "framer-motion";
import { Clock, Download, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";

const newFiles = [
  { id: 1, title: "Pack Carnaval Stories 2026", category: "Stories", format: "PSD", date: "12 Mar 2026", plan: "pro" },
  { id: 2, title: "Templates Dia das Mães", category: "Social Media", format: "AI", date: "11 Mar 2026", plan: "starter" },
  { id: 3, title: "Mockup Camiseta Streetwear", category: "Mockups", format: "PSD", date: "10 Mar 2026", plan: "master" },
  { id: 4, title: "Kit Anúncios Páscoa", category: "Anúncios", format: "ZIP", date: "09 Mar 2026", plan: "pro" },
  { id: 5, title: "Banner Lançamento Produto", category: "E-commerce", format: "PSD", date: "08 Mar 2026", plan: "starter" },
  { id: 6, title: "Pack Posts Fitness", category: "Posts Instagram", format: "PNG", date: "07 Mar 2026", plan: "starter" },
];

const Novidades = () => {
  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">
                Novidades
              </h1>
            </div>
            <p className="text-muted-foreground">
              Arquivos recém-adicionados à biblioteca.
            </p>
          </motion.div>

          <div className="space-y-4">
            {newFiles.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-gradient-card hover:border-primary/30 transition-colors"
              >
                <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{file.format}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-sm truncate">{file.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{file.category}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {file.date}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                  {file.plan}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Novidades;
