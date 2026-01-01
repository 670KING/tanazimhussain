import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
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

  const createConversation = async (model: string = 'gemini-flash') => {
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
    model: string = 'gemini-flash',
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
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

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
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
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
              // Skip invalid JSON
            }
          }
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
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    await supabase.from('conversations').delete().eq('id', conversationId);
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    fetchConversations();
  };

  const clearCurrentChat = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    currentConversation,
    conversations,
    sendMessage,
    createConversation,
    loadConversation,
    fetchConversations,
    deleteConversation,
    clearCurrentChat,
  };
}
