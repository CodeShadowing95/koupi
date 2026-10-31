/*
# Create moderation tables for Koupi proposals

1. New tables
- `submissions`: public code proposals waiting for review, including tool, creator, code, required source URL, optional contact information, status, duplicate marker, and moderation note.
- `moderation_logs`: append-only audit trail for moderator decisions, with the action, previous status, next status, and optional note.

2. Data integrity
- Submission status is limited to new, approved, rejected, or duplicate.
- Every submission requires a source URL and a code.
- A duplicate fingerprint helps the moderation queue surface repeated tool/code pairs without deleting any proposal.
- Foreign-key-free text fields keep the public intake available even when the proposed tool does not exist yet.

3. Security
- Row-level security is enabled on both tables.
- No public Data API grants are provided. The application writes and reads them through its server-side admin/service connection only.
- This prevents an anonymous browser from reading submitter emails or changing moderation state.

4. Important notes
- Existing data is not modified or deleted.
- The tables are created idempotently so this migration can safely be applied again.
*/

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL CHECK (char_length(trim(tool_name)) BETWEEN 1 AND 120),
  creator_name text NOT NULL CHECK (char_length(trim(creator_name)) BETWEEN 1 AND 160),
  code text NOT NULL CHECK (char_length(trim(code)) BETWEEN 1 AND 120),
  discount_label text NOT NULL CHECK (char_length(trim(discount_label)) BETWEEN 1 AND 240),
  source_url text NOT NULL CHECK (source_url ~* '^https?://'),
  creator_link text,
  comment text,
  submitter_email text,
  ip_hash text NOT NULL,
  fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','approved','rejected','duplicate')),
  admin_note text,
  created_code_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS submissions_status_created_idx ON public.submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_fingerprint_idx ON public.submissions(fingerprint);

CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approve','reject','mark_duplicate','restore')),
  previous_status text,
  next_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_logs_created_idx ON public.moderation_logs(created_at DESC);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.submissions FROM anon, authenticated;
REVOKE ALL ON public.moderation_logs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.submissions TO service_role;
GRANT SELECT, INSERT ON public.moderation_logs TO service_role;
