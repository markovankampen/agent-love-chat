-- Allow service role to insert tokens (for edge functions)
-- The service role key bypasses RLS by default, but we also need a policy 
-- for authenticated users who might resend verification
CREATE POLICY "Service can insert tokens"
ON public.email_verification_tokens
FOR INSERT
WITH CHECK (true);

-- Allow service to update tokens (for marking as verified)
CREATE POLICY "Service can update tokens"
ON public.email_verification_tokens
FOR UPDATE
USING (true);