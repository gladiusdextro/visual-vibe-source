import { useState } from "react";
import { Copy, CheckCircle, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schemaSQL = `-- =============================================
-- CriaHub - Schema SQL completo para migração
-- =============================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.file_format AS ENUM ('PSD', 'PNG', 'JPG', 'SVG', 'AI', 'PDF', 'ZIP');
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'pro', 'master');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- Tabela: profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Tabela: creative_files
CREATE TABLE public.creative_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  format public.file_format NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  plan_required public.subscription_plan NOT NULL DEFAULT 'starter',
  is_active BOOLEAN NOT NULL DEFAULT true,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'starter',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  downloads_limit INTEGER NOT NULL DEFAULT 10,
  downloads_used INTEGER NOT NULL DEFAULT 0,
  mercadopago_subscription_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  mercadopago_payment_id TEXT,
  mercadopago_preference_id TEXT,
  subscription_id UUID REFERENCES public.subscriptions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: download_history
CREATE TABLE public.download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.creative_files(id),
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Funções
-- =============================================

-- Função: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função: check_download_eligibility
CREATE OR REPLACE FUNCTION public.check_download_eligibility(p_file_id TEXT, p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file RECORD;
  v_sub RECORD;
  plan_order JSON := '{"starter":1,"pro":2,"master":3}'::JSON;
BEGIN
  SELECT * INTO v_file FROM public.creative_files WHERE id = p_file_id::UUID;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'Arquivo não encontrado');
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions
    WHERE user_id = p_user_id::UUID AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'Nenhuma assinatura ativa');
  END IF;

  IF v_sub.downloads_used >= v_sub.downloads_limit THEN
    RETURN json_build_object('eligible', false, 'reason', 'Limite de downloads atingido');
  END IF;

  RETURN json_build_object('eligible', true);
END;
$$;

-- Função: record_download
CREATE OR REPLACE FUNCTION public.record_download(p_file_id TEXT, p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.download_history (user_id, file_id)
  VALUES (p_user_id::UUID, p_file_id::UUID);

  UPDATE public.subscriptions
  SET downloads_used = downloads_used + 1, updated_at = now()
  WHERE user_id = p_user_id::UUID AND status = 'active';

  UPDATE public.creative_files
  SET downloads_count = downloads_count + 1, updated_at = now()
  WHERE id = p_file_id::UUID;
END;
$$;

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_history ENABLE ROW LEVEL SECURITY;

-- Profiles: usuários leem próprio perfil, admins leem todos
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Creative files: todos autenticados podem ler arquivos ativos
CREATE POLICY "Authenticated read active files" ON public.creative_files FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage files" ON public.creative_files FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Payments
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Download history
CREATE POLICY "Users read own downloads" ON public.download_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all downloads" ON public.download_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
`;

const SchemaPanel = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaSQL);
      setCopied(true);
      toast.success("SQL copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar. Selecione manualmente.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-display font-semibold text-lg">Schema SQL</h2>
              <p className="text-xs text-muted-foreground">
                SQL completo para recriar todas as tabelas, funções e políticas RLS
              </p>
            </div>
          </div>
          <Button
            onClick={handleCopy}
            size="sm"
            className="bg-gradient-primary text-primary-foreground"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copiar SQL
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <pre className="bg-secondary/50 border border-border rounded-lg p-4 overflow-auto max-h-[60vh] text-xs text-foreground font-mono whitespace-pre">
            {schemaSQL}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SchemaPanel;
