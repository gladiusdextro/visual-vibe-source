import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Download, Eye, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDownload } from "@/hooks/useDownload";
import { Link } from "react-router-dom";

const categories = [
  "Todos", "Social Media", "Marketing Digital", "Anúncios", "Posts Instagram",
  "Stories", "Flyers", "Banners", "E-commerce", "Mockups", "Templates",
];

const formats = ["Todos", "PSD", "PNG", "JPG", "SVG", "AI", "PDF", "ZIP"];

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  master: "Master",
};

const planColor: Record<string, string> = {
  starter: "bg-secondary text-secondary-foreground",
  pro: "bg-primary/20 text-primary",
  master: "bg-primary text-primary-foreground",
};

const Library = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedFormat, setSelectedFormat] = useState("Todos");
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { downloadFile } = useDownload();

  useEffect(() => {
    const fetchFiles = async () => {
      const { data } = await supabase
        .from("creative_files")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setFiles(data);
      setLoading(false);
    };
    fetchFiles();
  }, []);

  const filtered = files.filter((f) => {
    const matchSearch =
      search === "" ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.tags && f.tags.some((t: string) => t.includes(search.toLowerCase())));
    const matchCat = selectedCategory === "Todos" || f.category === selectedCategory;
    const matchFormat = selectedFormat === "Todos" || f.format === selectedFormat;
    return matchSearch && matchCat && matchFormat;
  });

  const getThumbnailUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("file-thumbnails").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDownload = async (fileId: string) => {
    if (!user) return;
    await downloadFile(fileId, user.id);
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Biblioteca <span className="text-gradient">Criativa</span>
            </h1>
            <p className="text-muted-foreground">
              Explore nossa coleção de arquivos profissionais prontos para editar.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <div className="space-y-4 mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Filter className="w-4 h-4 text-muted-foreground mt-2" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedFormat === fmt
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group rounded-xl border border-border bg-gradient-card overflow-hidden hover:border-primary/30 hover:shadow-glow transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-secondary/50 relative overflow-hidden">
                    {file.thumbnail_path ? (
                      <img
                        src={getThumbnailUrl(file.thumbnail_path) ?? ""}
                        alt={file.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-3xl font-display font-bold text-muted-foreground/30">{file.format}</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button size="sm" variant="outline" className="border-border bg-card/80">
                        <Eye className="w-4 h-4 mr-1" /> Preview
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className={`${planColor[file.plan_required]} text-[10px]`}>
                        {planLabels[file.plan_required]}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-display font-semibold text-sm mb-1 line-clamp-1">{file.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{file.category}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Download className="w-3 h-3" />
                        {file.downloads_count}
                      </div>
                    </div>
                    <div className="mt-3">
                      {user ? (
                        <Button
                          size="sm"
                          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 text-xs"
                          onClick={() => handleDownload(file.id)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Baixar
                        </Button>
                      ) : (
                        <Link to="/login">
                          <Button size="sm" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Assine para baixar
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum arquivo encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Library;
