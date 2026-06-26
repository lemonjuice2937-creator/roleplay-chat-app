/*
# Storage policies for imagens bucket

## Overview
Creates RLS policies for the public 'imagens' storage bucket so authenticated
users can upload and read images (roleplay avatars, chat backgrounds).

## Security
- SELECT (read): public — anyone can view images (bucket is public)
- INSERT (upload): authenticated users only
- UPDATE: users can only update their own files
- DELETE: users can only delete their own files
*/

-- Allow public read access to the imagens bucket
DROP POLICY IF EXISTS "Public read access for imagens" ON storage.objects;
CREATE POLICY "Public read access for imagens" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'imagens');

-- Allow authenticated users to upload to imagens
DROP POLICY IF EXISTS "Authenticated upload for imagens" ON storage.objects;
CREATE POLICY "Authenticated upload for imagens" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'imagens');

-- Allow users to update their own files
DROP POLICY IF EXISTS "Users can update own imagens" ON storage.objects;
CREATE POLICY "Users can update own imagens" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'imagens' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'imagens' AND auth.uid() = owner);

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete own imagens" ON storage.objects;
CREATE POLICY "Users can delete own imagens" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'imagens' AND auth.uid() = owner);
