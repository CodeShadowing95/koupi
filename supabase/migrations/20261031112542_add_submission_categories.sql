/*
# Add proposal categories for moderation filters

1. Modified table
- `submissions.category`: optional category label captured with each proposal, allowing administrators to group the moderation queue without requiring that the tool already exists in the catalogue.

2. Compatibility
- Existing proposals remain valid and receive an empty category until edited or replaced by a later submission.
- The column is nullable because contributors may not know the exact Koupi category.

3. Security
- No access policy or grant is widened. Proposals remain server-only through the existing service-role connection.

4. Important notes
- No rows are deleted or rewritten.
- The migration is safe to apply more than once.
*/

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS submissions_category_idx ON public.submissions(category);
