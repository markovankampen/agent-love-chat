
-- Logging table for photo reupload batch emails
CREATE TABLE public.photo_reupload_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  reupload_token text
);

-- Enable RLS
ALTER TABLE public.photo_reupload_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view all reupload emails"
ON public.photo_reupload_emails
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert (via edge function with service role, but also allow admin client)
CREATE POLICY "Admins can insert reupload emails"
ON public.photo_reupload_emails
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for duplicate check
CREATE UNIQUE INDEX idx_photo_reupload_emails_user_id ON public.photo_reupload_emails (user_id) WHERE status = 'sent';

-- Index for quick lookups
CREATE INDEX idx_photo_reupload_emails_status ON public.photo_reupload_emails (status);
