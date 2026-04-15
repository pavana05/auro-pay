
-- Drop overly permissive policies
DROP POLICY "Authenticated users can create conversations" ON public.conversations;
DROP POLICY "Authenticated users can add members" ON public.conversation_members;

-- Recreate with tighter checks
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = id AND user_id = auth.uid()
  )
  OR NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = id
  )
);

CREATE POLICY "Users can add members to their conversations"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.is_conversation_member(auth.uid(), conversation_id)
);
