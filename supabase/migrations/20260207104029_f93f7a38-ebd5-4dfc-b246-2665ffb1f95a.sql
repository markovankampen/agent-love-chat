-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service can insert tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Service can update tokens" ON public.email_verification_tokens;

-- The service role key already bypasses RLS, so we don't need these policies
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which has full access