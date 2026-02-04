import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { ResumeData, ResumeConfig, DEFAULT_RESUME_DATA, DEFAULT_RESUME_CONFIG } from '@/components/resume/types';

interface SavedResume {
  id: string;
  title: string;
  data: ResumeData;
  config: ResumeConfig;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useResumeStorage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all resumes
  const fetchResumes = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setResumes(data?.map(r => ({
        ...r,
        data: r.data as unknown as ResumeData,
        config: r.config as unknown as ResumeConfig,
      })) || []);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Upload photo to storage
  const uploadPhoto = useCallback(async (photoData: string): Promise<string | null> => {
    if (!user || !photoData) return null;
    
    try {
      // Convert base64 to blob
      const base64Data = photoData.split(',')[1];
      const mimeType = photoData.split(';')[0].split(':')[1] || 'image/jpeg';
      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Compress if needed (max 500KB)
      let finalBlob = blob;
      if (blob.size > 500 * 1024) {
        // Use canvas to compress
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const maxDim = 400;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = (height / width) * maxDim;
                width = maxDim;
              } else {
                width = (width / height) * maxDim;
                height = maxDim;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            resolve();
          };
          img.src = photoData;
        });
        
        finalBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b || blob),
            'image/jpeg',
            0.8
          );
        });
      }
      
      // Upload to storage
      const fileName = `${user.id}/photo_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('resume-photos')
        .upload(fileName, finalBlob, {
          upsert: true,
          contentType: 'image/jpeg',
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resume-photos')
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload photo:', error);
      return null;
    }
  }, [user]);

  // Save resume
  const saveResume = useCallback(async (
    data: ResumeData,
    config: ResumeConfig,
    title: string = 'My Resume'
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save your resume');
      return null;
    }
    
    setIsSaving(true);
    try {
      // Upload photo if it's a base64 string
      let photoUrl: string | null = null;
      if (data.personalInfo.photo?.startsWith('data:')) {
        photoUrl = await uploadPhoto(data.personalInfo.photo);
      } else if (data.personalInfo.photo) {
        photoUrl = data.personalInfo.photo;
      }
      
      // Prepare data without the base64 photo (store URL instead)
      const dataToSave = {
        ...data,
        personalInfo: {
          ...data.personalInfo,
          photo: photoUrl || '',
        },
      };
      
      if (currentResumeId) {
        // Update existing
        const { error } = await supabase
          .from('resumes')
          .update({
            title,
            data: JSON.parse(JSON.stringify(dataToSave)),
            config: JSON.parse(JSON.stringify(config)),
            photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentResumeId);
        
        if (error) throw error;
        toast.success('Resume saved');
        fetchResumes();
        return currentResumeId;
      } else {
        // Create new
        const { data: newResume, error } = await supabase
          .from('resumes')
          .insert([{
            user_id: user.id,
            title,
            data: JSON.parse(JSON.stringify(dataToSave)),
            config: JSON.parse(JSON.stringify(config)),
            photo_url: photoUrl,
          }])
          .select()
          .single();
        
        if (error) throw error;
        setCurrentResumeId(newResume.id);
        toast.success('Resume saved');
        fetchResumes();
        return newResume.id;
      }
    } catch (error) {
      console.error('Failed to save resume:', error);
      toast.error('Failed to save resume');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, currentResumeId, uploadPhoto, fetchResumes]);

  // Load a resume
  const loadResume = useCallback(async (id: string): Promise<{ data: ResumeData; config: ResumeConfig } | null> => {
    const resume = resumes.find(r => r.id === id);
    if (resume) {
      setCurrentResumeId(id);
      return { data: resume.data, config: resume.config };
    }
    
    // Fetch from database if not in cache
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setCurrentResumeId(id);
      return {
        data: data.data as unknown as ResumeData,
        config: data.config as unknown as ResumeConfig,
      };
    } catch (error) {
      console.error('Failed to load resume:', error);
      toast.error('Failed to load resume');
      return null;
    }
  }, [resumes]);

  // Delete a resume
  const deleteResume = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      if (currentResumeId === id) {
        setCurrentResumeId(null);
      }
      
      fetchResumes();
      toast.success('Resume deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete resume:', error);
      toast.error('Failed to delete resume');
      return false;
    }
  }, [currentResumeId, fetchResumes]);

  // Create new resume
  const createNewResume = useCallback(() => {
    setCurrentResumeId(null);
    return { data: DEFAULT_RESUME_DATA, config: DEFAULT_RESUME_CONFIG };
  }, []);

  return {
    resumes,
    currentResumeId,
    isLoading,
    isSaving,
    fetchResumes,
    saveResume,
    loadResume,
    deleteResume,
    createNewResume,
    setCurrentResumeId,
  };
}
