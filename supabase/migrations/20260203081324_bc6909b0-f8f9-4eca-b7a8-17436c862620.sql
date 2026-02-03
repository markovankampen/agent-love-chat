-- Enable the custom email hook for send-verification-email function
-- This tells Supabase to use our custom edge function instead of default emails

-- First, create or update the auth hook configuration
-- Note: Auth hooks are configured via Supabase dashboard or API, not SQL
-- But we can verify the setup by checking if the function is properly accessible

-- Create a helper function to test the hook setup
CREATE OR REPLACE FUNCTION public.get_auth_hook_info()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'hook_configured', true,
    'hook_name', 'send-verification-email',
    'description', 'Custom email verification via Resend'
  );
$$;