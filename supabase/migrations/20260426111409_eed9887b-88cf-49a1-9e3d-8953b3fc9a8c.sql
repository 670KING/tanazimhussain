-- Public bucket for AI-generated chat attachments (images + PDFs/HTML)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read (so the chat link is downloadable)
DROP POLICY IF EXISTS "chat_attachments_public_read" ON storage.objects;
CREATE POLICY "chat_attachments_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Only authenticated owner can upload to their own folder
DROP POLICY IF EXISTS "chat_attachments_owner_insert" ON storage.objects;
CREATE POLICY "chat_attachments_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "chat_attachments_owner_update" ON storage.objects;
CREATE POLICY "chat_attachments_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "chat_attachments_owner_delete" ON storage.objects;
CREATE POLICY "chat_attachments_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);