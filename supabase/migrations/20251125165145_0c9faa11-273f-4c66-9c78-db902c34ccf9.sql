-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow operations for dpgmedia user" ON conversations;

-- Create new policies that allow users to manage their own conversations
CREATE POLICY "Users can insert their own messages"
ON conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own messages"
ON conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON conversations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON conversations
FOR DELETE
USING (auth.uid() = user_id);