import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, Calendar, Users, Bell, Crown, LogOut, CreditCard as Edit3, Check, X, MessageSquare, Send, Star, Bug, Heart, CircleHelp as HelpCircle } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeedback } from '@/hooks/useFeedback';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function SettingsScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { subscriptionStatus, purchaseSubscription, cancelSubscription, loading: subscriptionLoading } = useSubscription();
  const { feedback, submitFeedback, loading: feedbackLoading } = useFeedback();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'subscription' | 'feedback'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    emergency_contact_name: profile?.emergency_contact_name || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
  });
  const [notifications, setNotifications] = useState({
    healthMetrics: true,
    friendRequests: true,
    readingRequests: true,
    pushNotifications: true,
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [saving, setSaving] = useState(false);
  
  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'suggestion' as 'suggestion' | 'bug' | 'praise' | 'other',
    title: '',
    description: '',
    rating: 0,
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile(editForm);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = async () => {
    const { success, error } = await purchaseSubscription(selectedPlan);
    if (success) {
      setShowUpgradeModal(false);
      Alert.alert('Success', 'Welcome to Thryve Premium!');
    } else {
      Alert.alert('Error', error || 'Failed to upgrade');
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your Premium subscription?',
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await cancelSubscription();
            if (success) {
              Alert.alert('Success', 'Subscription cancelled');
            } else {
              Alert.alert('Error', error || 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.title.trim() || !feedbackForm.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { error } = await submitFeedback(
        feedbackForm.type,
        feedbackForm.title,
        feedbackForm.description,
        feedbackForm.rating || undefined
      );

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Thank you for your feedback!');
        setFeedbackForm({
          type: 'suggestion',
          title: '',
          description: '',
          rating: 0,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <X size={20} color="#6B7280" />
          ) : (
            <Edit3 size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
      </View>

      {isEditing ? (
        <View style={styles.editForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.full_name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={editForm.date_of_birth}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, date_of_birth: text }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderOptions}>
              {['male', 'female', 'other', 'prefer_not_to_say'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    editForm.gender === option && styles.genderOptionSelected
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, gender: option }))}
                >
                  <Text style={[
                    styles.genderOptionText,
                    editForm.gender === option && styles.genderOptionTextSelected
                  ]}>
                    {option.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Emergency Contact Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.emergency_contact_name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, emergency_contact_name: text }))}
              placeholder="Enter emergency contact name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={editForm.emergency_contact_phone}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, emergency_contact_phone: text }))}
              placeholder="Enter emergency contact phone"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <LoadingSpinner size="small" color="#ffffff" />
            ) : (
              <>
                <Check size={16} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.profileDetails}>
          <View style={styles.detailItem}>
            <Phone size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{profile?.phone || 'Not set'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailValue}>{formatDate(profile?.date_of_birth)}</Text>
          </View>

          <View style={styles.detailItem}>
            <Users size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>
              {profile?.gender?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not set'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <User size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Emergency Contact</Text>
            <Text style={styles.detailValue}>
              {profile?.emergency_contact_name || 'Not set'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Phone size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Emergency Phone</Text>
            <Text style={styles.detailValue}>
              {profile?.emergency_contact_phone || 'Not set'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle}>Health Metrics</Text>
          <Text style={styles.notificationDescription}>
            Get notified when friends add new health metrics
          </Text>
        </View>
        <Switch
          value={notifications.healthMetrics}
          onValueChange={(value) => setNotifications(prev => ({ ...prev, healthMetrics: value }))}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor="#ffffff"
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle}>Friend Requests</Text>
          <Text style={styles.notificationDescription}>
            Get notified about new friend requests
          </Text>
        </View>
        <Switch
          value={notifications.friendRequests}
          onValueChange={(value) => setNotifications(prev => ({ ...prev, friendRequests: value }))}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor="#ffffff"
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle}>Reading Requests</Text>
          <Text style={styles.notificationDescription}>
            Get notified about health data reading requests
          </Text>
        </View>
        <Switch
          value={notifications.readingRequests}
          onValueChange={(value) => setNotifications(prev => ({ ...prev, readingRequests: value }))}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor="#ffffff"
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle}>Push Notifications</Text>
          <Text style={styles.notificationDescription}>
            Enable push notifications on this device
          </Text>
        </View>
        <Switch
          value={notifications.pushNotifications}
          onValueChange={(value) => setNotifications(prev => ({ ...prev, pushNotifications: value }))}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor="#ffffff"
        />
      </View>
    </View>
  );

  const renderSubscriptionTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.subscriptionStatus}>
        <View style={styles.subscriptionHeader}>
          <Crown size={24} color={subscriptionStatus.isPremium ? '#F59E0B' : '#9CA3AF'} />
          <Text style={styles.subscriptionTitle}>
            {subscriptionStatus.isPremium ? 'Premium' : 'Free'} Plan
          </Text>
        </View>
        
        {subscriptionStatus.isPremium ? (
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumText}>
              Plan: {subscriptionStatus.plan === 'monthly' ? 'Monthly' : 'Annual'}
            </Text>
            {subscriptionStatus.expiresAt && (
              <Text style={styles.expiryText}>
                Expires: {formatDate(subscriptionStatus.expiresAt)}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.freeText}>
            Upgrade to Premium for unlimited features
          </Text>
        )}
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        
        <View style={styles.featureItem}>
          <Check size={16} color={subscriptionStatus.isPremium ? '#10B981' : '#9CA3AF'} />
          <Text style={[styles.featureText, !subscriptionStatus.isPremium && styles.featureTextDisabled]}>
            Unlimited Health Tracking
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Check size={16} color={subscriptionStatus.isPremium ? '#10B981' : '#9CA3AF'} />
          <Text style={[styles.featureText, !subscriptionStatus.isPremium && styles.featureTextDisabled]}>
            Unlimited AI Conversations
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Check size={16} color={subscriptionStatus.isPremium ? '#10B981' : '#9CA3AF'} />
          <Text style={[styles.featureText, !subscriptionStatus.isPremium && styles.featureTextDisabled]}>
            Voice Entry for Health Metrics
          </Text>
        </View>
      </View>

      {!subscriptionStatus.isPremium ? (
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => setShowUpgradeModal(true)}
        >
          <Crown size={20} color="#ffffff" />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelSubscription}
        >
          <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFeedbackTab = () => (
    <View style={styles.tabContent}>
      {/* Header Section */}
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackTitle}>Help Us Improve Thryve</Text>
        <Text style={styles.feedbackSubtitle}>
          Your feedback helps us make Thryve better for everyone
        </Text>
      </View>

      {/* Submit Feedback Form */}
      <View style={styles.feedbackForm}>
        <Text style={styles.formSectionTitle}>Submit Feedback</Text>
        <Text style={styles.formSectionSubtitle}>Tell us what you think about Thryve</Text>

        {/* Feedback Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Feedback Type</Text>
          <View style={styles.feedbackTypeContainer}>
            {[
              { type: 'suggestion', icon: HelpCircle, label: 'Suggestion' },
              { type: 'bug', icon: Bug, label: 'Bug Report' },
              { type: 'praise', icon: Heart, label: 'Praise' },
              { type: 'other', icon: MessageSquare, label: 'Other' },
            ].map(({ type, icon: Icon, label }) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.feedbackTypeOption,
                  feedbackForm.type === type && styles.feedbackTypeOptionSelected
                ]}
                onPress={() => setFeedbackForm(prev => ({ ...prev, type: type as any }))}
              >
                <Icon size={16} color={feedbackForm.type === type ? '#ffffff' : '#6B7280'} />
                <Text style={[
                  styles.feedbackTypeText,
                  feedbackForm.type === type && styles.feedbackTypeTextSelected
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={feedbackForm.title}
            onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, title: text }))}
            placeholder="Brief summary of your feedback"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={feedbackForm.description}
            onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, description: text }))}
            placeholder="Please provide details about your feedback..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>
            {feedbackForm.description.length}/1000 characters
          </Text>
        </View>

        {/* Rating (optional) */}
        {feedbackForm.type === 'praise' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Rating (Optional)</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setFeedbackForm(prev => ({ ...prev, rating: star }))}
                >
                  <Star
                    size={24}
                    color={star <= feedbackForm.rating ? '#F59E0B' : '#D1D5DB'}
                    fill={star <= feedbackForm.rating ? '#F59E0B' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submittingFeedback && styles.submitButtonDisabled]}
          onPress={handleSubmitFeedback}
          disabled={submittingFeedback}
        >
          {submittingFeedback ? (
            <LoadingSpinner size="small" color="#ffffff" />
          ) : (
            <>
              <Send size={16} color="#ffffff" />
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Previous Feedback */}
      <View style={styles.previousFeedback}>
        <Text style={styles.formSectionTitle}>My Previous Feedback</Text>
        <Text style={styles.formSectionSubtitle}>Track the status of your submitted feedback</Text>
        
        {feedbackLoading ? (
          <LoadingSpinner />
        ) : feedback.length === 0 ? (
          <View style={styles.emptyFeedback}>
            <MessageSquare size={48} color="#D1D5DB" />
            <Text style={styles.emptyFeedbackText}>No feedback submitted yet</Text>
            <Text style={styles.emptyFeedbackSubtext}>
              Submit your first feedback to help us improve Thryve
            </Text>
          </View>
        ) : (
          feedback.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.feedbackItem}>
              <View style={styles.feedbackItemHeader}>
                <Text style={styles.feedbackItemTitle}>{item.title}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.feedbackItemDescription} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.feedbackItemDate}>
                Submitted on {formatDate(item.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Why Feedback Matters */}
      <View style={styles.whyFeedbackMatters}>
        <View style={styles.feedbackInfoHeader}>
          <View style={styles.feedbackInfoIcon}>
            <Heart size={20} color="#3B82F6" />
          </View>
          <Text style={styles.feedbackInfoTitle}>Why Your Feedback Matters</Text>
        </View>
        <Text style={styles.feedbackInfoText}>
          At Thryve, we're committed to creating the best health tracking experience possible. 
          Your feedback directly influences our development priorities and helps us improve the app for everyone.
        </Text>
        <View style={styles.feedbackBenefits}>
          <Text style={styles.benefitItem}>• Report bugs to help us fix issues quickly</Text>
          <Text style={styles.benefitItem}>• Suggest features you'd like to see</Text>
          <Text style={styles.benefitItem}>• Share what you love about Thryve</Text>
          <Text style={styles.benefitItem}>• Tell us how we can make your experience better</Text>
        </View>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FEF3C7';
      case 'reviewed': return '#DBEAFE';
      case 'implemented': return '#DCFCE7';
      case 'declined': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <User size={16} color={activeTab === 'profile' ? '#ffffff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Profile
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Bell size={16} color={activeTab === 'notifications' ? '#ffffff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscription' && styles.activeTab]}
          onPress={() => setActiveTab('subscription')}
        >
          <Crown size={16} color={activeTab === 'subscription' ? '#ffffff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'subscription' && styles.activeTabText]}>
            Subscription
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'feedback' && styles.activeTab]}
          onPress={() => setActiveTab('feedback')}
        >
          <MessageSquare size={16} color={activeTab === 'feedback' ? '#ffffff' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.activeTabText]}>
            Feedback
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'subscription' && renderSubscriptionTab()}
        {activeTab === 'feedback' && renderFeedbackTab()}
      </ScrollView>

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upgrade to Premium</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.planOptions}>
              <TouchableOpacity
                style={[styles.planOption, selectedPlan === 'monthly' && styles.planOptionSelected]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text style={styles.planTitle}>Monthly</Text>
                <Text style={styles.planPrice}>$9.99/month</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.planOption, selectedPlan === 'annual' && styles.planOptionSelected]}
                onPress={() => setSelectedPlan('annual')}
              >
                <Text style={styles.planTitle}>Annual</Text>
                <Text style={styles.planPrice}>$99.99/year</Text>
                <Text style={styles.planSavings}>Save 17%</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.purchaseButton, subscriptionLoading && styles.purchaseButtonDisabled]}
              onPress={handleUpgrade}
              disabled={subscriptionLoading}
            >
              {subscriptionLoading ? (
                <LoadingSpinner size="small" color="#ffffff" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  Subscribe for {selectedPlan === 'monthly' ? '$9.99/month' : '$99.99/year'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  signOutButton: {
    padding: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    padding: 12,
  },
  editForm: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 6,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  genderOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  genderOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  genderOptionTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  profileDetails: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 16,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 20,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  subscriptionStatus: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  premiumInfo: {
    marginTop: 12,
  },
  premiumText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  expiryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  freeText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
  },
  featuresContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 13,
    color: '#1F2937',
    marginLeft: 12,
  },
  featureTextDisabled: {
    color: '#9CA3AF',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 20,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 80,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  planOptions: {
    marginBottom: 40,
  },
  planOption: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planOptionSelected: {
    borderColor: '#3B82F6',
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  planPrice: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 6,
  },
  planSavings: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  purchaseButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Feedback Tab Styles
  feedbackHeader: {
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  feedbackSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  feedbackForm: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  formSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 24,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feedbackTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  feedbackTypeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  feedbackTypeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  feedbackTypeTextSelected: {
    color: '#ffffff',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  previousFeedback: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  emptyFeedback: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFeedbackText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyFeedbackSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  feedbackItem: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feedbackItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  feedbackItemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  feedbackItemDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  whyFeedbackMatters: {
    backgroundColor: '#F0F9FF',
    borderRadius: 24,
    padding: 28,
  },
  feedbackInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedbackInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  feedbackInfoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  feedbackInfoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
  },
  feedbackBenefits: {
    gap: 12,
  },
  benefitItem: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
});