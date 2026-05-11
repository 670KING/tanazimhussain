import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { DEFAULT_MODEL, DEFAULT_VISION_MODEL, isVisionModel } from '@/lib/ai-models';
import { PDFOptions } from '@/components/chat/PDFGenerator';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp?: Date;
  images?: string[];
  // AI-generated artifacts attached to the assistant message
  attachmentUrl?: string;
  attachmentTitle?: string;
  attachmentType?: 'pdf' | 'html';
  // Inline chart spec rendered in the message bubble
  chart?: ChartSpec;
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  xKey: string;
  yKeys: string[];
  data: Record<string, string | number>[];
}

export interface Conversation {
  id: string;
  title: string;
  model_used: string;
  created_at: string;
  updated_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TOOLS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-tools`;

async function callTool<T = any>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(TOOLS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.json().catch(() => ({}));
      console.warn('chat-tools error', res.status, t);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn('chat-tools fetch failed', e);
    return null;
  }
}

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isVisionMode, setIsVisionMode] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data as Conversation[]);
    }
  }, [user]);

  const createConversation = async (model: string = DEFAULT_MODEL) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Chat',
        model_used: model,
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentConversation(data as Conversation);
      setMessages([]);
      fetchConversations();
      return data as Conversation;
    }
    return null;
  };

  const loadConversation = async (conversationId: string) => {
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conv) {
      setCurrentConversation(conv as Conversation);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgs) {
        setMessages(msgs.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.created_at),
        })));
      }
    }
  };

  const updateConversationTitle = async (conversationId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    fetchConversations();
  };

  const sendMessage = async (
    content: string,
    model: string = DEFAULT_MODEL,
    type: 'chat' | 'quiz' | 'study_plan' | 'summary' | 'vision' | 'pdf' = 'chat',
    images: string[] = [],
    pdfOptions?: PDFOptions
  ): Promise<string> => {
    if (!user || !content.trim()) return '';

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(model);
      if (!conversation) return '';
    }

    // Determine if this is a vision request
    const hasImages = images.length > 0;
    const effectiveType = hasImages ? 'vision' : type;
    const effectiveModel = hasImages && !isVisionModel(model) ? DEFAULT_VISION_MODEL : model;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      images: hasImages ? images : undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentModel(null);
    setIsVisionMode(hasImages);

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: hasImages ? `[Image attached] ${content}` : content,
    });

    // Update title on first message
    if (messages.length === 0) {
      updateConversationTitle(conversation.id, content);
    }

    // ---------- INTENT ROUTER (auto-image / auto-pdf) ----------
    // Skip routing for explicit non-chat types or vision uploads.
    let detectedIntent: 'text' | 'pdf' | 'chart' = 'text';
    let routerPrompt = '';
    let routerTitle = '';
    if (type === 'chat' && !hasImages) {
      const routed = await callTool<{
        intent: 'text' | 'pdf' | 'chart';
        explanation: string;
        title: string;
        prompt: string;
      }>({ tool: 'router', message: content, hasImages: false });
      if (routed?.intent) {
        detectedIntent = routed.intent;
        routerPrompt = routed.prompt || content;
        routerTitle = routed.title || '';
      }
    }

    // Update usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single();

    if (usage) {
      await supabase
        .from('usage_logs')
        .update({ request_count: usage.request_count + 1 })
        .eq('id', usage.id);
    } else {
      await supabase.from('usage_logs').insert({
        user_id: user.id,
        usage_date: today,
        request_count: 1,
      });
    }

    let assistantContent = '';

    try {
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Bias the system to also produce a short explanation when image/pdf is chosen.
      const intentInstruction =
        detectedIntent === 'pdf'
          ? `\n\nThe user wants a downloadable PDF about: "${routerPrompt}". Acknowledge in 1-2 friendly sentences that you are preparing the document. A download link will appear below your message automatically.`
        : detectedIntent === 'chart'
          ? `\n\nThe user wants a chart/graph. Provide a 2-4 sentence markdown explanation of what the chart shows. The chart itself will render automatically below your text — do NOT try to draw it in ASCII or markdown.`
          : '';

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: intentInstruction
            ? [...allMessages.slice(0, -1), { ...allMessages[allMessages.length - 1], content: allMessages[allMessages.length - 1].content + intentInstruction }]
            : allMessages,
          model: effectiveModel, 
          stream: true, 
          type: effectiveType,
          images,
          pdfOptions,
          maxTokens: pdfOptions?.length === 'long' ? 16384 : 8192
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(errorData.error || 'Rate limited. Please wait a moment and try again.');
        }
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Get model info from headers
      const modelUsed = response.headers.get('X-Model-Used');
      const visionMode = response.headers.get('X-Vision-Mode') === 'true';
      
      if (modelUsed) {
        setCurrentModel(modelUsed);
      }
      setIsVisionMode(visionMode);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        model: modelUsed || effectiveModel,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: assistantContent,
        });
      }

      // ---------- POST-STREAM: generate pdf or chart in the background ----------
      if (detectedIntent === 'pdf') {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant'
            ? { ...m, attachmentTitle: 'Preparing your document…' }
            : m
        ));
        const out = await callTool<{ url: string; title: string; template: string }>({
          tool: 'pdf',
          title: routerTitle || content.slice(0, 60),
          topic: routerPrompt || content,
          length: 'medium',
        });
        setMessages(prev => prev.map((m, i) => {
          if (i !== prev.length - 1 || m.role !== 'assistant') return m;
          if (out?.url) return {
            ...m,
            attachmentUrl: out.url,
            attachmentTitle: out.title || 'Document',
            attachmentType: 'html',
          };
          return { ...m, attachmentTitle: undefined, content: m.content + '\n\n_⚠️ Document generation failed. Try again._' };
        }));
      } else if (detectedIntent === 'chart') {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant'
            ? { ...m, attachmentTitle: 'Building chart…' }
            : m
        ));
        const out = await callTool<{ chart: ChartSpec; explanation: string }>({
          tool: 'chart',
          prompt: routerPrompt || content,
        });
        setMessages(prev => prev.map((m, i) => {
          if (i !== prev.length - 1 || m.role !== 'assistant') return m;
          if (out?.chart && Array.isArray(out.chart.data) && out.chart.data.length > 0) {
            return { ...m, chart: out.chart, attachmentTitle: undefined };
          }
          return { ...m, attachmentTitle: undefined, content: m.content + '\n\n_⚠️ Chart generation failed. Try again._' };
        }));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      toast.error(errorMessage);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ ${errorMessage}\n\nPlease try again or select a different AI model.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }

    return assistantContent;
  };

  // Continue a truncated response
  const continueResponse = async (model: string = DEFAULT_MODEL): Promise<string> => {
    if (messages.length === 0) return '';
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return '';
    
    setIsLoading(true);
    
    try {
      // Send a continue request with context
      const continueMessages = [
        ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: messages[messages.length - 2]?.content || '' },
        { role: 'assistant' as const, content: lastMessage.content },
        { role: 'user' as const, content: 'Please continue from where you left off. Do not repeat what you already said, just continue the response.' }
      ];

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: continueMessages, 
          model, 
          stream: true, 
          type: 'chat',
          maxTokens: 16384
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to continue response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let continuedContent = lastMessage.content;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              continuedContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === lastMessage.id
                    ? { ...m, content: continuedContent }
                    : m
                )
              );
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Update the message in database
      if (currentConversation) {
        await supabase
          .from('messages')
          .update({ content: continuedContent })
          .eq('conversation_id', currentConversation.id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1);
      }

      toast.success('Response continued');
      return continuedContent;
    } catch (error) {
      console.error('Continue error:', error);
      toast.error('Failed to continue response');
      return lastMessage.content;
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateLastMessage = async (model: string = DEFAULT_MODEL) => {
    if (messages.length < 2) return;
    
    // Find the last user message
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;
    
    const actualIndex = messages.length - 1 - lastUserIndex;
    const lastUserMessage = messages[actualIndex];
    
    // Remove messages from the last user message onwards
    setMessages(prev => prev.slice(0, actualIndex));
    
    // Resend the message
    await sendMessage(
      lastUserMessage.content, 
      model, 
      'chat', 
      lastUserMessage.images || []
    );
  };

  const deleteConversation = async (conversationId: string) => {
    await supabase.from('messages').delete().eq('conversation_id', conversationId);
    await supabase.from('conversations').delete().eq('id', conversationId);
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    fetchConversations();
    toast.success('Conversation deleted');
  };

  const clearCurrentChat = () => {
    setCurrentConversation(null);
    setMessages([]);
    setCurrentModel(null);
    setIsVisionMode(false);
  };

  return {
    messages,
    isLoading,
    currentConversation,
    conversations,
    currentModel,
    isVisionMode,
    sendMessage,
    createConversation,
    loadConversation,
    fetchConversations,
    deleteConversation,
    clearCurrentChat,
    regenerateLastMessage,
    continueResponse,
  };
}
