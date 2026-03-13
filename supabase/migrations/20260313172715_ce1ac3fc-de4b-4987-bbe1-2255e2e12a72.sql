
-- Allow authenticated users to download creative files (needed for the download function)
CREATE POLICY "Authenticated users can download files" ON storage.objects 
FOR SELECT USING (bucket_id = 'creative-files' AND auth.role() = 'authenticated');

-- Allow admins to update creative files metadata
CREATE POLICY "Admins can update creative files" ON storage.objects 
FOR UPDATE USING (bucket_id = 'creative-files' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update thumbnails
CREATE POLICY "Admins can update thumbnails" ON storage.objects 
FOR UPDATE USING (bucket_id = 'file-thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Add admin RLS for profiles (to count users in admin panel)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Add insert policy for subscriptions (auto-create on signup or admin)
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
