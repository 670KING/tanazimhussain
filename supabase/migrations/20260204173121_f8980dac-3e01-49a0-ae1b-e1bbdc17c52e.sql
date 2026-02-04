-- Create storage bucket for resume photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resume-photos', 
  'resume-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their own resume photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resume-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own photos
CREATE POLICY "Users can update their own resume photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resume-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own resume photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resume-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to resume photos (needed for PDF generation)
CREATE POLICY "Resume photos are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'resume-photos');

-- Create resumes table to store resume data
CREATE TABLE public.resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Resume',
  data JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Users can view their own resumes
CREATE POLICY "Users can view own resumes"
ON public.resumes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own resumes
CREATE POLICY "Users can create own resumes"
ON public.resumes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own resumes
CREATE POLICY "Users can update own resumes"
ON public.resumes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON public.resumes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_resumes_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();