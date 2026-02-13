
-- Create a function that sends changes to the sync edge function
CREATE OR REPLACE FUNCTION public.notify_sync_to_external()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Build payload based on operation
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );

  -- Call the sync edge function via pg_net
  SELECT value INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT value INTO service_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/sync-to-external',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key,
      'x-webhook-source', 'database'
    ),
    body := payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on all synced tables
CREATE TRIGGER sync_profiles_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();

CREATE TRIGGER sync_conversations_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();

CREATE TRIGGER sync_matches_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();

CREATE TRIGGER sync_face_analysis_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.face_analysis
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();

CREATE TRIGGER sync_notification_settings_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();

CREATE TRIGGER sync_email_verification_tokens_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.email_verification_tokens
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();

CREATE TRIGGER sync_user_roles_to_external
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.notify_sync_to_external();
