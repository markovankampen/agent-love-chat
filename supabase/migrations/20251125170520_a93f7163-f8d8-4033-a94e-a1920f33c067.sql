-- Make email nullable to support anonymous guest users
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- Update the handle_new_user trigger to handle anonymous users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''));
  RETURN NEW;
END;
$function$;