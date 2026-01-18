import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { DEFAULT_MODEL } from '@/lib/ai-models';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  model_used: string;
  created_at: string;
  updated_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

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
    type: 'chat' | 'quiz' | 'study_plan' | 'summary' = 'chat'
  ) => {
    if (!user || !content.trim()) return;

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation(model);
      if (!conversation) return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentModel(null);

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content,
    });

    // Update title on first message
    if (messages.length === 0) {
      updateConversationTitle(conversation.id, content);
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

    try {
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, model, stream: true, type }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(errorData.error || 'Rate limited. Please wait a moment and try again.');
        }
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Get model used from header
      const modelUsed = response.headers.get('X-Model-Used');
      if (modelUsed) {
        setCurrentModel(modelUsed);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        model: modelUsed || model,
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
            // Incomplete JSON, put back in buffer
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
  };

  return {
    messages,
    isLoading,
    currentConversation,
    conversations,
    currentModel,
    sendMessage,
    createConversation,
    loadConversation,
    fetchConversations,
    deleteConversation,
    clearCurrentChat,
  };
}
