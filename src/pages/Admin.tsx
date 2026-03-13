import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, Users, Download, FileText, Plus, Trash2, Eye, BarChart3,
  Search, ChevronDown, X, CreditCard, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";

const categories = [
  "Social Media", "Marketing Digital", "Anúncios", "Posts Instagram",
  "Stories", "Flyers", "Banners", "E-commerce", "Mockups", "Templates",
];

const formats = ["PSD", "PNG", "JPG", "SVG", "AI", "PDF", "ZIP"] as const;
const plans = ["starter", "pro", "master"] as const;

const Admin = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFiles: 0, totalUsers: 0, totalDownloads: 0, totalSubscribers: 0 });
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState<string>("");
  const [planRequired, setPlanRequired] = useState<string>("starter");
  const [tags, setTags] = useState("");
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [thumbnailUpload, setThumbnailUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [filesRes, profilesRes, downloadsRes, subsRes, paymentsRes] = await Promise.all([
      supabase.from("creative_files").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("download_history").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("payments").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(50),
    ]);
    if (filesRes.data) setFiles(filesRes.data);
    if (subsRes.data) setSubscribers(subsRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    setStats({
      totalFiles: filesRes.data?.length ?? 0,
      totalUsers: profilesRes.count ?? 0,
      totalDownloads: downloadsRes.count ?? 0,
      totalSubscribers: subsRes.data?.filter((s: any) => s.status === "active").length ?? 0,
    });
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUpload || !category || !format) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setUploading(true);

    try {
      const fileExt = fileUpload.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      const { error: fileError } = await supabase.storage
        .from("creative-files")
        .upload(filePath, fileUpload);
      if (fileError) throw fileError;

      let thumbnailPath = null;
      if (thumbnailUpload) {
        const thumbExt = thumbnailUpload.name.split(".").pop();
        const thumbPath = `${crypto.randomUUID()}.${thumbExt}`;
        const { error: thumbError } = await supabase.storage
          .from("file-thumbnails")
          .upload(thumbPath, thumbnailUpload);
        if (thumbError) throw thumbError;
        thumbnailPath = thumbPath;
      }

      const { error: dbError } = await supabase.from("creative_files").insert({
        title,
        description,
        category,
        format: format as any,
        plan_required: planRequired as any,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        file_path: filePath,
        thumbnail_path: thumbnailPath,
        file_size_bytes: fileUpload.size,
      });
      if (dbError) throw dbError;

      toast.success("Arquivo enviado com sucesso!");
      setUploadOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar arquivo.");
    }
    setUploading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setFormat("");
    setPlanRequired("starter");
    setTags("");
    setFileUpload(null);
    setThumbnailUpload(null);
  };

  const handleDelete = async (fileId: string, filePath: string, thumbnailPath: string | null) => {
    if (!confirm("Tem certeza que deseja remover este arquivo?")) return;
    await supabase.storage.from("creative-files").remove([filePath]);
    if (thumbnailPath) await supabase.storage.from("file-thumbnails").remove([thumbnailPath]);
    await supabase.from("creative_files").delete().eq("id", fileId);
    toast.success("Arquivo removido.");
    fetchData();
  };

  const planLabel: Record<string, string> = { starter: "Starter", pro: "Pro", master: "Master" };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                Painel <span className="text-gradient">Admin</span>
              </h1>
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-1" /> Novo Arquivo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display">Upload de Arquivo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria *</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Formato *</Label>
                        <Select value={format} onValueChange={setFormat}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Plano mínimo</Label>
                      <Select value={planRequired} onValueChange={setPlanRequired}>
                        <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {plans.map((p) => <SelectItem key={p} value={p}>{planLabel[p]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (separadas por vírgula)</Label>
                      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="social, instagram, marketing" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Arquivo *</Label>
                      <Input type="file" onChange={(e) => setFileUpload(e.target.files?.[0] ?? null)} className="bg-secondary border-border" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Thumbnail (preview)</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setThumbnailUpload(e.target.files?.[0] ?? null)} className="bg-secondary border-border" />
                    </div>
                    <Button type="submit" disabled={uploading} className="w-full bg-gradient-primary text-primary-foreground">
                      <Upload className="w-4 h-4 mr-1" />
                      {uploading ? "Enviando..." : "Enviar arquivo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-border bg-gradient-card p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold font-display">{stats.totalFiles}</p>
                  <p className="text-xs text-muted-foreground">Arquivos</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-gradient-card p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold font-display">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-gradient-card p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10"><Download className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold font-display">{stats.totalDownloads}</p>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-gradient-card p-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10"><Crown className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold font-display">{stats.totalSubscribers}</p>
                  <p className="text-xs text-muted-foreground">Assinantes ativos</p>
                </div>
              </div>
            </div>

            <Tabs defaultValue="files" className="space-y-4">
              <TabsList>
                <TabsTrigger value="files">Arquivos</TabsTrigger>
                <TabsTrigger value="subscribers">Assinantes</TabsTrigger>
                <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              </TabsList>

              <TabsContent value="files">
                <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-display font-semibold">Arquivos na Biblioteca</h2>
                  </div>
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum arquivo enviado ainda.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Formato</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Downloads</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {files.map((file) => (
                            <TableRow key={file.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">{file.title}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{file.category}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-[10px]">{file.format}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{planLabel[file.plan_required]}</Badge></TableCell>
                              <TableCell className="text-sm">{file.downloads_count}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(file.created_at).toLocaleDateString("pt-BR")}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(file.id, file.file_path, file.thumbnail_path)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="subscribers">
                <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-display font-semibold">Assinantes</h2>
                  </div>
                  {subscribers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Nenhum assinante.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Downloads</TableHead>
                            <TableHead>Período</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscribers.map((sub: any) => (
                            <TableRow key={sub.id}>
                              <TableCell className="text-sm">{(sub.profiles as any)?.full_name || sub.user_id.slice(0, 8)}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{planLabel[sub.plan]}</Badge></TableCell>
                              <TableCell>
                                <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-[10px]">
                                  {sub.status === "active" ? "Ativo" : sub.status === "cancelled" ? "Cancelado" : sub.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{sub.downloads_used}/{sub.downloads_limit}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="payments">
                <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-display font-semibold">Histórico de Pagamentos</h2>
                  </div>
                  {payments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Nenhum pagamento registrado.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-sm">{(p.profiles as any)?.full_name || p.user_id.slice(0, 8)}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{planLabel[p.plan]}</Badge></TableCell>
                              <TableCell className="text-sm">R$ {Number(p.amount).toFixed(2).replace(".", ",")}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={p.status === "approved" ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {p.status === "approved" ? "Aprovado" : p.status === "pending" ? "Pendente" : p.status === "rejected" ? "Recusado" : p.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.payment_method === "credit_card" ? "Cartão" : p.payment_method === "pix" ? "PIX" : p.payment_method || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(p.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;
