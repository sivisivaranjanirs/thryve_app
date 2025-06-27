import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Mic, MicOff, Volume2, VolumeX, History, Plus, Trash2, Clock, X, MessageSquare } from 'lucide-react-native';
import { useSubscription } from '@/hooks/useSubscription';
import { useChat } from '@/hooks/useChat';
import { useVoice } from '@/hooks/useVoice';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { VoiceButton } from '@/components/VoiceButton';
import { AnimatedView, StaggeredList } from '@/components/AnimatedView';
import { AnimatedButton, FloatingActionButton } from '@/components/AnimatedButton';
import { AnimatedModal } from '@/components/AnimatedModal';
import { ChatMessage } from '@/lib/types';

// Hardcoded AI responses for health topics
const AI_RESPONSES = {
  blood_pressure: [
    "Blood pressure readings can vary throughout the day. Normal blood pressure is typically around 120/80 mmHg. If you're seeing consistently high readings, it's worth discussing with your healthcare provider.",
    "Great job tracking your blood pressure! Regular monitoring helps identify patterns. Remember that stress, caffeine, and physical activity can all affect your readings.",
    "Blood pressure management often involves lifestyle factors like diet, exercise, and stress management. Keep up the good work with tracking!"
  ],
  heart_rate: [
    "Your resting heart rate can be a good indicator of cardiovascular fitness. A normal resting heart rate for adults ranges from 60-100 beats per minute.",
    "Heart rate can be influenced by many factors including fitness level, stress, caffeine, and medications. Regular tracking helps you understand your baseline.",
    "If you notice unusual patterns in your heart rate, especially if accompanied by symptoms like dizziness or chest pain, consider consulting your doctor."
  ],
  weight: [
    "Weight can fluctuate daily due to factors like hydration, meals, and hormones. Focus on long-term trends rather than daily changes.",
    "Healthy weight management is about sustainable habits rather than quick fixes. Small, consistent changes often lead to lasting results.",
    "Remember that weight is just one measure of health. How you feel, your energy levels, and overall well-being are equally important."
  ],
  exercise: [
    "Regular physical activity is one of the best things you can do for your health. Even 30 minutes of moderate activity most days can make a big difference.",
    "Find activities you enjoy - whether it's walking, dancing, swimming, or playing sports. The best exercise is the one you'll stick with!",
    "Listen to your body and start gradually if you're new to exercise. Consistency is more important than intensity when you're beginning."
  ],
  sleep: [
    "Quality sleep is crucial for physical and mental health. Most adults need 7-9 hours per night for optimal functioning.",
    "Good sleep hygiene includes keeping a consistent schedule, creating a relaxing bedtime routine, and limiting screens before bed.",
    "If you're having trouble sleeping, consider factors like caffeine intake, room temperature, and stress levels that might be affecting your rest."
  ],
  stress: [
    "Chronic stress can impact many aspects of health, from blood pressure to immune function. Finding healthy ways to manage stress is important.",
    "Stress management techniques like deep breathing, meditation, exercise, or talking to friends can be very effective.",
    "Remember that some stress is normal, but if you're feeling overwhelmed regularly, don't hesitate to seek support from friends, family, or professionals."
  ],
  nutrition: [
    "A balanced diet with plenty of fruits, vegetables, whole grains, and lean proteins provides the nutrients your body needs to function well.",
    "Hydration is often overlooked but crucial for health. Aim for about 8 glasses of water daily, more if you're active or in hot weather.",
    "Small changes like adding more vegetables to meals or choosing whole grains can have a big impact over time."
  ],
  default: [
    "I'm here to help with your health and wellness questions. Feel free to ask about topics like blood pressure, exercise, nutrition, sleep, or stress management.",
    "Health is a journey, not a destination. Every small step you take toward better health matters, so be proud of your efforts!",
    "Remember that I can provide general health information, but for specific medical concerns, it's always best to consult with your healthcare provider."
  ]
};

export default function ChatScreen() {
  const { getPremiumFeatures } = useSubscription();
  const { 
    currentConversation, 
    messages, 
    conversations,
    loading,
    addMessage,
    createConversation,
    deleteConversation,
    selectConversation,
  } = useChat();
  const premiumFeatures = getPremiumFeatures();
  
  const {
    isRecording,
    isPlaying,
    isProcessing: voiceProcessing,
    error: voiceError,
    speakText,
    startRecording,
    clearError: clearVoiceError,
  } = useVoiceChat({
    autoPlay: true,
    recordingDuration: 5000,
    language: 'en',
  });
  
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const MAX_FREE_MESSAGES = 3;

  // Initialize with welcome message if no conversation
  useEffect(() => {
    if (!currentConversation && !loading) {
      initializeChat();
    }
  }, [currentConversation, loading]);

  const initializeChat = async () => {
    const title = `Health Chat ${new Date().toLocaleDateString()}`;
    const { data, error } = await createConversation(title);
    
    if (!error && data) {
      // Add welcome message
      await addMessage(data.id, "Hello! I'm your AI health companion. I'm here to help you with questions about health, wellness, and your health tracking journey. How can I assist you today?", 'assistant');
    }
  };

  useEffect(() => {
    // Load daily message count from storage
    const today = new Date().toDateString();
    const storedCount = localStorage.getItem(`messageCount_${today}`);
    
    if (storedCount) {
      setDailyMessageCount(parseInt(storedCount, 10));
    }
  }, []);

  const updateDailyMessageCount = (count: number) => {
    setDailyMessageCount(count);
    const today = new Date().toDateString();
    localStorage.setItem(`messageCount_${today}`, count.toString());
  };

  const getAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Determine topic based on keywords
    if (message.includes('blood pressure') || message.includes('bp')) {
      const responses = AI_RESPONSES.blood_pressure;
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (message.includes('heart rate') || message.includes('pulse')) {
      const responses = AI_RESPONSES.heart_rate;
      
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (message.includes('weight') || message.includes('scale')) {
      const responses = AI_RESPONSES.weight;
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (message.includes('exercise') || message.includes('workout') || message.includes('fitness')) {
      const responses = AI_RESPONSES.exercise;
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (message.includes('sleep') || message.includes('tired') || message.includes('rest')) {
      const responses = AI_RESPONSES.sleep;
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (message.includes('stress') || message.includes('anxiety') || message.includes('worried')) {
      const responses = AI_RESPONSES.stress;
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (message.includes('food') || message.includes('diet') || message.includes('nutrition') || message.includes('eat')) {
      const responses = AI_RESPONSES.nutrition;
      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      const responses = AI_RESPONSES.default;
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const sendMessage = async (text: string, isVoice = false) => {
    if (!text.trim()) return;

    if (!currentConversation) {
      Alert.alert('Error', 'No active conversation. Please try again.');
      return;
    }

    // Check message limit for free users
    if (!premiumFeatures.unlimitedAIConversations && dailyMessageCount >= MAX_FREE_MESSAGES) {
      Alert.alert(
        'Daily Limit Reached',
        `You've reached your daily limit of ${MAX_FREE_MESSAGES} AI messages. Upgrade to Premium for unlimited conversations!`,
        [{ text: 'OK' }]
      );
      return;
    }

    setInputText('');
    setIsProcessing(true);

    // Add user message
    const { error: userError } = await addMessage(currentConversation.id, text, 'user', isVoice);
    if (userError) {
      Alert.alert('Error', userError.message);
      setIsProcessing(false);
      return;
    }

    // Update message count
    const newCount = dailyMessageCount + 1;
    updateDailyMessageCount(newCount);

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const aiResponse = getAIResponse(text);
      
      // Add AI response
      const { error: aiError } = await addMessage(currentConversation.id, aiResponse, 'assistant');
      if (aiError) {
        Alert.alert('Error', 'Failed to get AI response');
      }

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      Alert.alert('Error', 'Failed to get AI response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewConversation = async () => {
    const title = `Health Chat ${new Date().toLocaleDateString()}`;
    const { data, error } = await createConversation(title);
    
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSelectConversation = (conversation: any) => {
    selectConversation(conversation);
    setShowHistoryModal(false);
  };

  const handleDeleteConversation = (id: string, title: string) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteConversation(id);
            if (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const handleVoiceInput = () => {
    if (!premiumFeatures.unlimitedAIConversations && dailyMessageCount >= MAX_FREE_MESSAGES) {
      Alert.alert(
        'Daily Limit Reached',
        `You've reached your daily limit of ${MAX_FREE_MESSAGES} AI messages. Upgrade to Premium for unlimited conversations!`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (isRecording) {
      Alert.alert('Recording in Progress', 'Please wait for the current recording to finish.');
      return;
    }

    startRecording()
      .then((transcription) => {
        if (transcription.text) {
          sendMessage(transcription.text, true);
        } else {
          Alert.alert('No Speech Detected', 'Please try speaking again.');
        }
      })
      .catch((error) => {
        console.error('Voice input error:', error);
        Alert.alert('Voice Input Error', 'Failed to process voice input. Please try again.');
      });
  };

  const handleTextToSpeech = (messageId: string, text: string) => {
    if (isPlaying) {
      Alert.alert('Audio Playing', 'Please wait for the current audio to finish.');
      return;
    }

    speakText(text).catch((error) => {
      console.error('Text-to-speech error:', error);
      Alert.alert('Speech Error', 'Failed to play audio. Please try again.');
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const remainingMessages = premiumFeatures.unlimitedAIConversations 
    ? null 
    : Math.max(0, MAX_FREE_MESSAGES - dailyMessageCount);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner type="pulse" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedView type="slideDown" delay={100}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Talk to me</Text>
            <Text style={styles.subtitle}>Your AI health companion</Text>
          </View>
          <View style={styles.headerActions}>
            <AnimatedButton
              style={styles.historyButton}
              onPress={() => setShowHistoryModal(true)}
            >
              <History size={20} color="#3B82F6" />
            </AnimatedButton>
            <AnimatedButton
              style={styles.newChatButton}
              onPress={handleNewConversation}
            >
              <Plus size={20} color="#ffffff" />
            </AnimatedButton>
          </View>
        </View>
      </AnimatedView>
      
      {!premiumFeatures.unlimitedAIConversations && (
        <AnimatedView type="slideDown" delay={150}>
          <View style={styles.messageCountContainer}>
            <Text style={styles.messageCount}>
              {remainingMessages} messages left today
            </Text>
          </View>
        </AnimatedView>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        <StaggeredList staggerDelay={150} itemDelay={200}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.message_type === 'user' ? styles.userMessage : styles.assistantMessage,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.message_type === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.message_type === 'user' ? styles.userText : styles.assistantText,
                  ]}
                >
                  {message.content}
                </Text>
                {message.is_voice && (
                  <View style={styles.voiceIndicator}>
                    <Mic size={12} color={message.message_type === 'user' ? '#ffffff' : '#3B82F6'} />
                  </View>
                )}
              </View>
              
              <View style={styles.messageFooter}>
                <Text style={styles.messageTime}>{formatTime(message.created_at)}</Text>
                {message.message_type === 'assistant' && Platform.OS !== 'web' && (
                  <AnimatedButton
                    style={styles.speakButton}
                    onPress={() => handleTextToSpeech(message.id, message.content)}
                    disabled={isPlaying || voiceProcessing}
                    pressScale={0.9}
                  >
                    {isPlaying ? (
                      <VolumeX size={14} color="#6B7280" />
                    ) : (
                      <Volume2 size={14} color="#6B7280" />
                    )}
                  </AnimatedButton>
                )}
              </View>
            </View>
          ))}
        </StaggeredList>
        
        {isProcessing && (
          <AnimatedView type="fade">
            <View style={[styles.messageContainer, styles.assistantMessage]}>
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <LoadingSpinner size="small" color="#3B82F6" type="dots" />
              </View>
            </View>
          </AnimatedView>
        )}
      </ScrollView>

      <AnimatedView type="slideUp" delay={300}>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me about your health..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!isProcessing}
            />
            
            <VoiceButton
              variant="record"
              isRecording={isRecording}
              isProcessing={voiceProcessing}
              recordingProgress={0} // We'll implement this in the hook
              showProgress={isRecording}
              onPress={handleVoiceInput}
              disabled={isProcessing || voiceProcessing}
              style={styles.voiceButton}
            />
            
            <AnimatedButton
              style={[styles.sendButton, (!inputText.trim() || isProcessing) && styles.sendButtonDisabled]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isProcessing || voiceProcessing}
              pressScale={0.9}
            >
              <Send size={20} color="#ffffff" />
            </AnimatedButton>
          </View>
        </View>
      </AnimatedView>

      {/* Chat History Modal */}
      <AnimatedModal
        visible={showHistoryModal}
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <AnimatedButton onPress={() => setShowHistoryModal(false)}>
              <X size={24} color="#6B7280" />
            </AnimatedButton>
            <Text style={styles.modalTitle}>Chat History</Text>
            <AnimatedButton onPress={handleNewConversation}>
              <Plus size={24} color="#3B82F6" />
            </AnimatedButton>
          </View>

          <ScrollView style={styles.modalContent}>
            {conversations.length === 0 ? (
              <View style={styles.emptyHistoryState}>
                <History size={48} color="#D1D5DB" />
                <Text style={styles.emptyHistoryText}>No conversations yet</Text>
                <Text style={styles.emptyHistorySubtext}>
                  Start chatting to see your conversation history
                </Text>
              </View>
            ) : (
              <StaggeredList staggerDelay={50} itemDelay={0}>
                {conversations.map((conversation) => (
                  <AnimatedButton
                    key={conversation.id}
                    style={[
                      styles.conversationItem,
                      currentConversation?.id === conversation.id && styles.conversationItemActive
                    ]}
                    onPress={() => handleSelectConversation(conversation)}
                    pressScale={0.98}
                  >
                    <View style={styles.conversationHeader}>
                      <View style={styles.conversationIcon}>
                        <MessageSquare size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.conversationInfo}>
                        <Text style={styles.conversationTitle} numberOfLines={1}>
                          {conversation.title}
                        </Text>
                        <Text style={styles.conversationDate}>
                          {formatHistoryDate(conversation.updated_at)}
                        </Text>
                      </View>
                      <AnimatedButton
                        style={styles.deleteConversationButton}
                        onPress={() => handleDeleteConversation(conversation.id, conversation.title)}
                        pressScale={0.9}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </AnimatedButton>
                    </View>
                  </AnimatedButton>
                ))}
              </StaggeredList>
            )}
          </ScrollView>
        </SafeAreaView>
      </AnimatedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  historyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageCountContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  messageCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#1F2937',
  },
  voiceIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
  },
  speakButton: {
    padding: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 10,
  },
  voiceButton: {
    marginLeft: 12,
  },
  voiceButtonActive: {
    backgroundColor: '#EF4444',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyHistoryState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  conversationItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationItemActive: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  conversationDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteConversationButton: {
    padding: 8,
  },
});