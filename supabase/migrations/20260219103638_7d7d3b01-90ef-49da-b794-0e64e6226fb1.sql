
-- Add permanent_photo_url column to face_analysis
ALTER TABLE public.face_analysis ADD COLUMN permanent_photo_url text;

-- Make profile-photos bucket public so URLs never expire
UPDATE storage.buckets SET public = true WHERE id = 'profile-photos';
