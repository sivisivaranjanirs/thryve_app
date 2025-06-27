import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { SubscriptionStatus, PremiumFeatures } from '@/lib/types';

// Web-only storage for this demo
const getStorageItem = (key: string): string | null => {
  return localStorage.getItem(key);
};

const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

// Mock subscription service for web development
export function useSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    plan: 'free',
    status: 'active',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = () => {
    try {
      const stored = getStorageItem('subscription_status');
      if (stored) {
        setSubscriptionStatus(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSubscriptionStatus = (status: SubscriptionStatus) => {
    try {
      setStorageItem('subscription_status', JSON.stringify(status));
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error saving subscription status:', error);
    }
  };

  const purchaseSubscription = async (plan: 'monthly' | 'annual') => {
    setLoading(true);
    
    try {
      // Mock purchase logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + (plan === 'monthly' ? 1 : 12));
      
      const newStatus: SubscriptionStatus = {
        isPremium: true,
        plan,
        status: 'active',
        expiresAt: expiresAt.toISOString(),
      };
      
      saveSubscriptionStatus(newStatus);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Purchase failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async () => {
    setLoading(true);
    
    try {
      // Mock restore logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would check with the app store
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Restore failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setLoading(true);
    
    try {
      // Mock cancellation logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newStatus: SubscriptionStatus = {
        ...subscriptionStatus,
        status: 'cancelled',
      };
      
      saveSubscriptionStatus(newStatus);
      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cancellation failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const getPremiumFeatures = (): PremiumFeatures => {
    return {
      unlimitedHealthTracking: subscriptionStatus.isPremium,
      unlimitedAIConversations: subscriptionStatus.isPremium,
      voiceEntryForHealthMetrics: subscriptionStatus.isPremium,
    };
  };

  return {
    subscriptionStatus,
    loading,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    getPremiumFeatures,
  };
}