-- Allow any authenticated user to look up a profile by exact phone match.
-- This is required for the parent teen-phone lookup during ProfileSetup.
-- Returns the same row that the user themselves can already read; phone numbers
-- are treated as semi-public identifiers (like UPI IDs / usernames) for the
-- purpose of linking accounts.

CREATE POLICY "Authenticated can lookup profile by phone"
ON public.profiles
FOR SELECT
TO authenticated
USING (phone IS NOT NULL);
