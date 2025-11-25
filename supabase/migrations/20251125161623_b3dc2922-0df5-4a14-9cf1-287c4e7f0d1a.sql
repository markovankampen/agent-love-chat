-- Drop existing restrictive policies on conversations table
DROP POLICY IF EXISTS "Users can insert their own messages" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

-- Create new policies that allow operations for the hardcoded dpgmedia user
CREATE POLICY "Allow dpgmedia user to insert messages"
ON conversations
FOR INSERT
WITH CHECK (user_id = '93fc2384-4b8b-4f53-a5a6-9f53caaab22a');

CREATE POLICY "Allow dpgmedia user to view conversations"
ON conversations
FOR SELECT
USING (user_id = '93fc2384-4b8b-4f53-a5a6-9f53caaab22a');

CREATE POLICY "Allow dpgmedia user to update messages"
ON conversations
FOR UPDATE
USING (user_id = '93fc2384-4b8b-4f53-a5a6-9f53caaab22a');

-- Also allow the edge function (service role) to insert agent responses
CREATE POLICY "Allow service role to insert agent messages"
ON conversations
FOR INSERT
WITH CHECK (role = 'agent');