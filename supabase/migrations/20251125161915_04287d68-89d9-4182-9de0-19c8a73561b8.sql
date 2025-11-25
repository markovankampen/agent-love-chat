-- Drop all existing policies on conversations table
DROP POLICY IF EXISTS "Allow dpgmedia user to insert messages" ON conversations;
DROP POLICY IF EXISTS "Allow dpgmedia user to view conversations" ON conversations;
DROP POLICY IF EXISTS "Allow dpgmedia user to update messages" ON conversations;
DROP POLICY IF EXISTS "Allow service role to insert agent messages" ON conversations;

-- Create permissive policies that allow operations for the hardcoded dpgmedia user
-- without requiring authentication
CREATE POLICY "Allow operations for dpgmedia user"
ON conversations
FOR ALL
USING (user_id = '93fc2384-4b8b-4f53-a5a6-9f53caaab22a')
WITH CHECK (user_id = '93fc2384-4b8b-4f53-a5a6-9f53caaab22a');