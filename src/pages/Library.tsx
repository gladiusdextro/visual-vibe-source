import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Download, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";

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

// Mock data
const mockFiles = [
  { id: 1, title: "Pack Social Media Stories", category: "Stories", format: "PSD", plan: "starter", downloads: 342, tags: ["instagram", "stories", "social"] },
  { id: 2, title: "Kit Marketing Digital Premium", category: "Marketing Digital", format: "AI", plan: "pro", downloads: 567, tags: ["marketing", "digital", "premium"] },
  { id: 3, title: "Mockup iPhone 15 Pro", category: "Mockups", format: "PSD", plan: "master", downloads: 891, tags: ["mockup", "iphone", "device"] },
  { id: 4, title: "Templates Feed Instagram", category: "Posts Instagram", format: "PNG", plan: "starter", downloads: 234, tags: ["instagram", "feed", "post"] },
  { id: 5, title: "Banner E-commerce Black Friday", category: "E-commerce", format: "PSD", plan: "pro", downloads: 456, tags: ["ecommerce", "banner", "black friday"] },
  { id: 6, title: "Flyer Evento Corporativo", category: "Flyers", format: "PDF", plan: "starter", downloads: 123, tags: ["flyer", "evento", "corporativo"] },
  { id: 7, title: "Pack Anúncios Facebook & Google", category: "Anúncios", format: "ZIP", plan: "pro", downloads: 678, tags: ["ads", "facebook", "google"] },
  { id: 8, title: "Social Media Kit Completo", category: "Social Media", format: "ZIP", plan: "master", downloads: 1024, tags: ["social media", "kit", "completo"] },
  { id: 9, title: "Mockup Embalagem Produto", category: "Mockups", format: "PSD", plan: "pro", downloads: 345, tags: ["mockup", "embalagem", "produto"] },
  { id: 10, title: "Templates Marketing Email", category: "Templates", format: "SVG", plan: "starter", downloads: 189, tags: ["template", "email", "marketing"] },
  { id: 11, title: "Banner Web Responsivo", category: "Banners", format: "PSD", plan: "starter", downloads: 267, tags: ["banner", "web", "responsivo"] },
  { id: 12, title: "Pack Stories Animados", category: "Stories", format: "ZIP", plan: "master", downloads: 743, tags: ["stories", "animado", "premium"] },
];

const planColor: Record<string, string> = {
  starter: "bg-secondary text-secondary-foreground",
  pro: "bg-primary/20 text-primary",
  master: "bg-primary text-primary-foreground",
};

const Library = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedFormat, setSelectedFormat] = useState("Todos");

  const filtered = mockFiles.filter((f) => {
    const matchSearch = search === "" || f.title.toLowerCase().includes(search.toLowerCase()) || f.tags.some(t => t.includes(search.toLowerCase()));
    const matchCat = selectedCategory === "Todos" || f.category === selectedCategory;
    const matchFormat = selectedFormat === "Todos" || f.format === selectedFormat;
    return matchSearch && matchCat && matchFormat;
  });

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group rounded-xl border border-border bg-gradient-card overflow-hidden hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-[4/3] bg-secondary/50 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-3xl font-display font-bold text-muted-foreground/30">{file.format}</div>
                  </div>
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button size="sm" variant="outline" className="border-border bg-card/80">
                      <Eye className="w-4 h-4 mr-1" /> Preview
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={`${planColor[file.plan]} text-[10px]`}>
                      {planLabels[file.plan]}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display font-semibold text-sm mb-1 line-clamp-1">{file.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{file.category}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Download className="w-3 h-3" />
                      {file.downloads}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button size="sm" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      Assine para baixar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
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
