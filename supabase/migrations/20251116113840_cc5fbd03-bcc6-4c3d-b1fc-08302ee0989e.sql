-- Add INSERT policy for profiles table to prevent RLS errors
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Note: The handle_new_user trigger runs with SECURITY DEFINER
-- so it can insert profiles, but this policy helps prevent RLS errors
-- if there are any race conditions or manual profile creation attempts