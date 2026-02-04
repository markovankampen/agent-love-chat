-- Drop the overly permissive policy and create a proper one
DROP POLICY IF EXISTS "Service role can insert matches" ON public.matches;

-- No INSERT policy needed for regular users - only service role (via edge function) can insert
-- The service role bypasses RLS automatically, so we don't need an INSERT policy