import { useState } from "react";
import { Download, Database, Users, FileText, CreditCard, Crown, Shield, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportItem {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  table: string;
  columns?: string;
}

const exportItems: ExportItem[] = [
  { key: "creative_files", label: "Arquivos Criativos", icon: FileText, description: "Todos os arquivos da biblioteca", table: "creative_files" },
  { key: "profiles", label: "Perfis de Usuários", icon: Users, description: "Dados de perfil de todos os usuários", table: "profiles" },
  { key: "subscriptions", label: "Assinaturas", icon: Crown, description: "Todas as assinaturas e status", table: "subscriptions" },
  { key: "payments", label: "Pagamentos", icon: CreditCard, description: "Histórico completo de pagamentos", table: "payments" },
  { key: "download_history", label: "Histórico de Downloads", icon: Download, description: "Todos os downloads realizados", table: "download_history" },
  { key: "user_roles", label: "Permissões de Usuários", icon: Shield, description: "Roles atribuídas aos usuários", table: "user_roles" },
];

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ExportDataPanel = () => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [exportedKeys, setExportedKeys] = useState<Set<string>>(new Set());

  const handleExport = async (item: ExportItem) => {
    setLoadingKey(item.key);
    try {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from(item.table as any)
          .select("*")
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (allData.length === 0) {
        const columnMap: Record<string, string[]> = {
          creative_files: ["id","title","description","category","format","file_path","thumbnail_path","plan_required","is_active","downloads_count","file_size_bytes","tags","created_at","updated_at"],
          profiles: ["id","full_name","avatar_url","created_at","updated_at"],
          subscriptions: ["id","user_id","plan","status","current_period_start","current_period_end","downloads_limit","downloads_used","mercadopago_subscription_id","stripe_subscription_id","created_at","updated_at"],
          payments: ["id","user_id","plan","amount","currency","status","payment_method","mercadopago_payment_id","mercadopago_preference_id","subscription_id","created_at","updated_at"],
          download_history: ["id","user_id","file_id","downloaded_at"],
          user_roles: ["id","user_id","role"],
        };
        const headers = columnMap[item.table] || [];
        const csv = headers.join(",");
        downloadCSV(csv, item.key);
        setExportedKeys((prev) => new Set(prev).add(item.key));
        toast.info(`Nenhum registro em "${item.label}", exportado apenas os cabeçalhos.`);
        setLoadingKey(null);
        return;
      }

      const csv = convertToCSV(allData);
      downloadCSV(csv, item.key);
      setExportedKeys((prev) => new Set(prev).add(item.key));
      toast.success(`${allData.length} registros exportados de "${item.label}".`);
    } catch (err: any) {
      toast.error(`Erro ao exportar "${item.label}": ${err.message}`);
    }
    setLoadingKey(null);
  };

  const handleExportAll = async () => {
    for (const item of exportItems) {
      await handleExport(item);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-display font-semibold text-lg">Exportar Dados (CSV)</h2>
              <p className="text-xs text-muted-foreground">Exporte todos os dados do banco de dados em formato CSV</p>
            </div>
          </div>
          <Button
            onClick={handleExportAll}
            disabled={!!loadingKey}
            className="bg-gradient-primary text-primary-foreground"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Exportar Tudo
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportItems.map((item) => {
            const Icon = item.icon;
            const isLoading = loadingKey === item.key;
            const isExported = exportedKeys.has(item.key);

            return (
              <button
                key={item.key}
                onClick={() => handleExport(item)}
                disabled={!!loadingKey}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-left disabled:opacity-50"
              >
                <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : isExported ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Icon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExportDataPanel;
