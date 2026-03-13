import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDownload = () => {
  const downloadFile = async (fileId: string, userId: string) => {
    // Check eligibility
    const { data: eligibility, error: eligError } = await supabase.rpc(
      "check_download_eligibility",
      { p_user_id: userId, p_file_id: fileId }
    );

    if (eligError) {
      toast.error("Erro ao verificar elegibilidade.");
      return false;
    }

    const result = typeof eligibility === "string" ? JSON.parse(eligibility) : eligibility;

    if (!result.eligible) {
      const messages: Record<string, string> = {
        no_active_subscription: "Você precisa de uma assinatura ativa para baixar.",
        file_not_found: "Arquivo não encontrado.",
        plan_insufficient: `Este arquivo requer o plano ${result.required_plan?.charAt(0).toUpperCase() + result.required_plan?.slice(1) || "superior"}.`,
        download_limit_reached: "Você atingiu o limite de downloads do seu plano.",
      };
      toast.error(messages[result.reason] || "Download não permitido.");
      return false;
    }

    // Get file path
    const { data: fileData, error: fileError } = await supabase
      .from("creative_files")
      .select("file_path, title")
      .eq("id", fileId)
      .single();

    if (fileError || !fileData) {
      toast.error("Arquivo não encontrado.");
      return false;
    }

    // Download from storage
    const { data: blob, error: dlError } = await supabase.storage
      .from("creative-files")
      .download(fileData.file_path);

    if (dlError) {
      toast.error("Erro ao baixar o arquivo.");
      return false;
    }

    // Record download
    await supabase.rpc("record_download", { p_user_id: userId, p_file_id: fileId });

    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileData.title + "." + fileData.file_path.split(".").pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Download iniciado!");
    return true;
  };

  return { downloadFile };
};
