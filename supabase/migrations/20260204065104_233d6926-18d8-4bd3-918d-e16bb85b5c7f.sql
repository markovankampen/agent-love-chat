-- Create matches table to store match results
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  compatibility_reasons JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'accepted', 'rejected')),
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, matched_user_id)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Users can view their own matches (both as user or matched_user)
CREATE POLICY "Users can view their own matches"
ON public.matches
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- Users can update their own matches (for accepting/rejecting)
CREATE POLICY "Users can update matches where they are the user"
ON public.matches
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only backend can insert matches (service role)
CREATE POLICY "Service role can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for faster lookups
CREATE INDEX idx_matches_user_id ON public.matches(user_id);
CREATE INDEX idx_matches_matched_user_id ON public.matches(matched_user_id);
CREATE INDEX idx_matches_status ON public.matches(status);

-- Add matching_complete flag to profiles to track if matching has been done
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matching_complete BOOLEAN DEFAULT false;