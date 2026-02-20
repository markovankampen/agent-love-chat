
-- Create photo reupload tokens table
CREATE TABLE public.photo_reupload_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.photo_reupload_tokens ENABLE ROW LEVEL SECURITY;

-- Service role will access this table via edge functions, no public policies needed
-- But allow users to read their own tokens for status checking
CREATE POLICY "Users can view own reupload tokens"
  ON public.photo_reupload_tokens
  FOR SELECT
  USING (auth.uid() = user_id);
