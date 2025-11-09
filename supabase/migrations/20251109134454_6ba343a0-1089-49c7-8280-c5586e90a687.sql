-- Add new columns to profiles table for enhanced profile data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS hair_color TEXT,
ADD COLUMN IF NOT EXISTS eye_color TEXT,
ADD COLUMN IF NOT EXISTS facial_features JSONB;

-- Create storage bucket for temporary photo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos-temp',
  'profile-photos-temp',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for temporary photo bucket
CREATE POLICY "Users can upload their own temp photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos-temp' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own temp photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos-temp' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own temp photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos-temp' AND
  auth.uid()::text = (storage.foldername(name))[1]
);