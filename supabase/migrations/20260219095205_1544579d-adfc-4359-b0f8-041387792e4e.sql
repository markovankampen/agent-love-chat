
-- Create a permanent backup bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos-backup', 'profile-photos-backup', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can read from backup bucket
CREATE POLICY "Admins can read backup photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos-backup' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Service role can insert (used by edge function)
CREATE POLICY "Service role can insert backup photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos-backup');
