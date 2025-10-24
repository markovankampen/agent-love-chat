-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username TEXT;

-- Add unique constraint for usernames
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Update the handle_new_user function to include username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$;