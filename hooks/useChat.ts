import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatConversation, ChatMessage } from '@/lib/types';
import { useAuth } from './useAuth';

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (title: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setCurrentConversation(data);
      setMessages([]);
      
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create conversation');
      setError(error.message);
      return { data: null, error };
    }
  };

  const addMessage = async (conversationId: string, content: string, messageType: 'user' | 'assistant', isVoice = false) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          message_type: messageType,
          content,
          is_voice: isVoice,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);

      // Update conversation's updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add message');
      setError(error.message);
      return { data: null, error };
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete conversation');
      setError(error.message);
      return { error };
    }
  };

  const selectConversation = (conversation: ChatConversation) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation.id);
  };

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    createConversation,
    addMessage,
    deleteConversation,
    selectConversation,
  };
}