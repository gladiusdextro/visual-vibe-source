
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'pro', 'master');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
CREATE TYPE public.file_format AS ENUM ('PSD', 'PNG', 'JPG', 'SVG', 'AI', 'PDF', 'ZIP');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan subscription_plan NOT NULL DEFAULT 'starter',
  status subscription_status NOT NULL DEFAULT 'active',
  downloads_used INT NOT NULL DEFAULT 0,
  downloads_limit INT NOT NULL DEFAULT 20,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Creative Files
CREATE TABLE public.creative_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  format file_format NOT NULL,
  tags TEXT[] DEFAULT '{}',
  plan_required subscription_plan NOT NULL DEFAULT 'starter',
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  downloads_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active files" ON public.creative_files FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage files" ON public.creative_files FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Download History
CREATE TABLE public.download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.creative_files(id) ON DELETE CASCADE NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.download_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own downloads" ON public.download_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own downloads" ON public.download_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all downloads" ON public.download_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Function to check download eligibility
CREATE OR REPLACE FUNCTION public.check_download_eligibility(p_user_id UUID, p_file_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_file RECORD;
  v_plan_level INT;
  v_required_level INT;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'no_active_subscription');
  END IF;

  SELECT * INTO v_file FROM public.creative_files WHERE id = p_file_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'file_not_found');
  END IF;

  -- Check plan level
  v_plan_level := CASE v_sub.plan WHEN 'starter' THEN 1 WHEN 'pro' THEN 2 WHEN 'master' THEN 3 END;
  v_required_level := CASE v_file.plan_required WHEN 'starter' THEN 1 WHEN 'pro' THEN 2 WHEN 'master' THEN 3 END;

  IF v_plan_level < v_required_level THEN
    RETURN json_build_object('eligible', false, 'reason', 'plan_insufficient', 'required_plan', v_file.plan_required);
  END IF;

  -- Check download limit (master = unlimited = -1)
  IF v_sub.downloads_limit > 0 AND v_sub.downloads_used >= v_sub.downloads_limit THEN
    RETURN json_build_object('eligible', false, 'reason', 'download_limit_reached');
  END IF;

  RETURN json_build_object('eligible', true);
END;
$$;

-- Function to record download and increment counters
CREATE OR REPLACE FUNCTION public.record_download(p_user_id UUID, p_file_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.download_history (user_id, file_id) VALUES (p_user_id, p_file_id);
  UPDATE public.subscriptions SET downloads_used = downloads_used + 1, updated_at = now() WHERE user_id = p_user_id;
  UPDATE public.creative_files SET downloads_count = downloads_count + 1, updated_at = now() WHERE id = p_file_id;
END;
$$;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('creative-files', 'creative-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('file-thumbnails', 'file-thumbnails', true);

-- Storage RLS for thumbnails (public read)
CREATE POLICY "Public can view thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'file-thumbnails');
CREATE POLICY "Admins can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'file-thumbnails' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'file-thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS for creative files (admin upload, authenticated download via edge function)
CREATE POLICY "Admins can upload creative files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'creative-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete creative files" ON storage.objects FOR DELETE USING (bucket_id = 'creative-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view creative files" ON storage.objects FOR SELECT USING (bucket_id = 'creative-files' AND public.has_role(auth.uid(), 'admin'));
