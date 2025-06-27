export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          phone: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
          phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      health_metrics: {
        Row: {
          id: string
          user_id: string
          metric_type: 'blood_pressure' | 'blood_glucose' | 'heart_rate' | 'temperature' | 'weight'
          value: string
          unit: string
          notes: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metric_type: 'blood_pressure' | 'blood_glucose' | 'heart_rate' | 'temperature' | 'weight'
          value: string
          unit: string
          notes?: string | null
          recorded_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metric_type?: 'blood_pressure' | 'blood_glucose' | 'heart_rate' | 'temperature' | 'weight'
          value?: string
          unit?: string
          notes?: string | null
          recorded_at?: string
          created_at?: string
        }
      }
      reading_permissions: {
        Row: {
          id: string
          viewer_id: string
          owner_id: string
          status: 'active' | 'blocked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          viewer_id: string
          owner_id: string
          status?: 'active' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          viewer_id?: string
          owner_id?: string
          status?: 'active' | 'blocked'
          created_at?: string
          updated_at?: string
        }
      }
      reading_requests: {
        Row: {
          id: string
          requester_id: string
          owner_id: string
          status: 'pending' | 'accepted' | 'declined'
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          owner_id: string
          status?: 'pending' | 'accepted' | 'declined'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          owner_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          message_type: 'user' | 'assistant'
          content: string
          is_voice: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          message_type: 'user' | 'assistant'
          content: string
          is_voice?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          message_type?: 'user' | 'assistant'
          content?: string
          is_voice?: boolean | null
          created_at?: string
        }
      }
      friend_notifications: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          notification_type: 'health_metric' | 'friend_request' | 'friend_accepted' | 'reading_request' | 'reading_accepted'
          title: string
          message: string
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          notification_type: 'health_metric' | 'friend_request' | 'friend_accepted' | 'reading_request' | 'reading_accepted'
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          notification_type?: 'health_metric' | 'friend_request' | 'friend_accepted' | 'reading_request' | 'reading_accepted'
          title?: string
          message?: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh_key?: string
          auth_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notification_queue: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          title: string
          body: string
          data: Json | null
          status: 'pending' | 'sent' | 'failed'
          attempts: number
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          title: string
          body: string
          data?: Json | null
          status?: 'pending' | 'sent' | 'failed'
          attempts?: number
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          title?: string
          body?: string
          data?: Json | null
          status?: 'pending' | 'sent' | 'failed'
          attempts?: number
          created_at?: string
          processed_at?: string | null
        }
      }
      user_feedback: {
        Row: {
          id: string
          user_id: string
          user_name: string
          user_email: string | null
          type: 'suggestion' | 'bug' | 'praise' | 'other'
          title: string
          description: string
          rating: number | null
          status: 'pending' | 'reviewed' | 'implemented' | 'declined'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          user_email?: string | null
          type: 'suggestion' | 'bug' | 'praise' | 'other'
          title: string
          description: string
          rating?: number | null
          status?: 'pending' | 'reviewed' | 'implemented' | 'declined'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          user_email?: string | null
          type?: 'suggestion' | 'bug' | 'praise' | 'other'
          title?: string
          description?: string
          rating?: number | null
          status?: 'pending' | 'reviewed' | 'implemented' | 'declined'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      accept_reading_request: {
        Args: {
          request_id: string
        }
        Returns: undefined
      }
      decline_reading_request: {
        Args: {
          request_id: string
        }
        Returns: undefined
      }
      create_friend_notification: {
        Args: {
          target_user_id: string
          from_user_id: string
          notif_type: string
          notif_title: string
          notif_message: string
          notif_data?: Json
        }
        Returns: string
      }
      get_user_health_summary: {
        Args: {
          target_user_id: string
          days_back?: number
        }
        Returns: Json
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
  }
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type HealthMetric = Database['public']['Tables']['health_metrics']['Row'];
export type ReadingPermission = Database['public']['Tables']['reading_permissions']['Row'];
export type ReadingRequest = Database['public']['Tables']['reading_requests']['Row'];
export type ChatConversation = Database['public']['Tables']['chat_conversations']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type FriendNotification = Database['public']['Tables']['friend_notifications']['Row'];
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row'];
export type NotificationQueueItem = Database['public']['Tables']['notification_queue']['Row'];
export type UserFeedback = Database['public']['Tables']['user_feedback']['Row'];

export type MetricType = 'blood_pressure' | 'blood_glucose' | 'heart_rate' | 'temperature' | 'weight';
export type NotificationType = 'health_metric' | 'friend_request' | 'friend_accepted' | 'reading_request' | 'reading_accepted';

export interface HealthMetricEntry {
  id?: string;
  metric_type: MetricType;
  value: string;
  unit: string;
  notes?: string;
  recorded_at: string;
}

export interface PremiumFeatures {
  unlimitedHealthTracking: boolean;
  unlimitedAIConversations: boolean;
  voiceEntryForHealthMetrics: boolean;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  plan: 'free' | 'monthly' | 'annual';
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: string;
}