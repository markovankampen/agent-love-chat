-- Create face_analysis table to store Face++ API results
CREATE TABLE public.face_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  attractiveness_score numeric,
  facial_features jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.face_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for face_analysis
CREATE POLICY "Users can view their own face analysis"
ON public.face_analysis
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own face analysis"
ON public.face_analysis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own face analysis"
ON public.face_analysis
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);