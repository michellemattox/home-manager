-- Add photo storage to pest/disease logs

ALTER TABLE garden_pest_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE garden_pest_logs ADD COLUMN IF NOT EXISTS ai_identification JSONB;

-- Storage bucket for garden photos (run this in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('garden-photos', 'garden-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload garden photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'garden-photos');

-- Allow authenticated users to update their own photos
CREATE POLICY "Authenticated users can update garden photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'garden-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access
CREATE POLICY "Garden photos are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'garden-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete garden photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'garden-photos');
