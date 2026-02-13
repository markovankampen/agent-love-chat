-- Recreate the trigger to auto-create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop the unique constraint on username since multiple users can have NULL usernames
-- and usernames aren't required at signup
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_unique;

-- Also backfill any auth users that are missing profiles
INSERT INTO public.profiles (id, email)
SELECT au.id, COALESCE(au.email, '')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;