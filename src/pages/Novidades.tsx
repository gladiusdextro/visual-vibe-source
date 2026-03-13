import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Download, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  master: "Master",
};

const Novidades = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      const { data } = await supabase
        .from("creative_files")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setFiles(data);
      setLoading(false);
    };
    fetchFiles();
  }, []);

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
              <h1 className="text-3xl md:text-4xl font-bold">Novidades</h1>
            </div>
            <p className="text-muted-foreground">
              Arquivos recém-adicionados à biblioteca.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum arquivo novo por enquanto.
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file, i) => (
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
                        <Clock className="w-3 h-3" /> {new Date(file.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {planLabels[file.plan_required] || file.plan_required}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Novidades;
