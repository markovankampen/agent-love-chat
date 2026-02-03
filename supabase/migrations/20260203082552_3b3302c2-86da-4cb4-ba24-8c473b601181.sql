-- Add email_verified field to profiles to track our own verification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Update existing profiles to mark them as verified (they were verified through old flow)
UPDATE public.profiles SET email_verified = true WHERE email_verified IS NULL;