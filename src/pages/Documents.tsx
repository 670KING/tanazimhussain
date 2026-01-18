import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  Loader2,
  File,
  FileSpreadsheet,
  Clock,
  Eye,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content: string | null;
  file_type: string | null;
  created_at: string;
}

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDocuments(data);
    }
    setIsLoading(false);
  };

  const saveDocument = async () => {
    if (!title.trim() || !user) return;
    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title,
          content,
          file_type: 'note',
        })
        .select()
        .single();

      if (!error && data) {
        setDocuments(prev => [data, ...prev]);
        setShowForm(false);
        setTitle('');
        setContent('');
        toast({ title: 'Saved!', description: 'Document saved successfully' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save document', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast({ title: 'Deleted', description: 'Document removed' });
    }
  };

  const exportToTxt = (doc: Document) => {
    const blob = new Blob([doc.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Document exported as TXT' });
  };

  const exportToCsv = (doc: Document) => {
    const lines = (doc.content || '').split('\n');
    const csvContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Document exported as CSV' });
  };

  const exportToHtml = (doc: Document) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  <p class="meta">Created: ${new Date(doc.created_at).toLocaleDateString()}</p>
  <div class="content">${doc.content || ''}</div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Document exported as HTML' });
  };

  const getFileIcon = (type: string | null) => {
    switch (type) {
      case 'quiz': return FileSpreadsheet;
      case 'chat': return FileText;
      default: return File;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Save and export your content</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" /> New Document
        </Button>
      </div>

      {showForm && (
        <Card className="animate-slide-up border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Create Document
            </CardTitle>
            <CardDescription>Save notes, summaries, or any content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Document content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
            <div className="flex gap-2">
              <Button onClick={saveDocument} disabled={isSaving || !title.trim()} className="gradient-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Document
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">Create your first document or export from chats</p>
            <Button onClick={() => setShowForm(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" /> Create Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            return (
              <Card key={doc.id} className="group hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                          {doc.file_type && (
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {doc.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {doc.content}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>{doc.title}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh]">
                          <div className="prose-ai whitespace-pre-wrap p-4">
                            {doc.content || 'No content'}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 pt-4 border-t">
                          <Button size="sm" variant="outline" onClick={() => exportToTxt(doc)}>
                            <Download className="w-3 h-3 mr-1" /> TXT
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => exportToCsv(doc)}>
                            <FileSpreadsheet className="w-3 h-3 mr-1" /> CSV
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => exportToHtml(doc)}>
                            <FileText className="w-3 h-3 mr-1" /> HTML
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                      className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
