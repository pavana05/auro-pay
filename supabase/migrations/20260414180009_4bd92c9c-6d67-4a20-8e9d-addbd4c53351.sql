
-- Allow parents to delete spending limits they created
CREATE POLICY "Parents can delete spending limits"
ON public.spending_limits
FOR DELETE
USING (auth.uid() = set_by_parent_id);

-- Allow parents to view linked teen profiles
CREATE POLICY "Parents can view linked teen profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parent_teen_links
    WHERE parent_teen_links.parent_id = auth.uid()
    AND parent_teen_links.teen_id = profiles.id
    AND parent_teen_links.is_active = true
  )
);
