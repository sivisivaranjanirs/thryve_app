import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Search,
  Heart,
  Droplets,
  Thermometer,
  Scale,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
} from 'lucide-react-native';
import { useReadingPermissions } from '@/hooks/useReadingPermissions';
import { useUsers } from '@/hooks/useUsers';
import { useHealthMetrics } from '@/hooks/useHealthMetrics';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AppHeader } from '@/components/AppHeader';
import { UserProfile, HealthMetric, MetricType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const HEALTH_ICONS = {
  blood_pressure: Heart,
  blood_glucose: Droplets,
  heart_rate: Heart,
  temperature: Thermometer,
  weight: Scale,
};

const HEALTH_COLORS = {
  blood_pressure: '#EF4444',
  blood_glucose: '#3B82F6',
  heart_rate: '#F59E0B',
  temperature: '#F97316',
  weight: '#8B5CF6',
};

export default function FriendsScreen() {
  const { user } = useAuth();
  const { 
    permissions, 
    requests, 
    loading: permissionsLoading,
    sendReadingRequest,
    acceptRequest,
    declineRequest,
    togglePermissionStatus,
  } = useReadingPermissions();
  const { users, loading: usersLoading, searchUsers } = useUsers();
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);
  const [friendHealthData, setFriendHealthData] = useState<HealthMetric[]>([]);
  const [loadingHealthData, setLoadingHealthData] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    canView: true,
    whoCanView: false,
    requests: false,
  });
  
  const loading = permissionsLoading || usersLoading;

  async function handleSendInvite() {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const { error } = await sendReadingRequest(inviteEmail, inviteMessage);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Request Sent',
        `Reading request sent to ${inviteEmail}`,
        [{ text: 'OK', onPress: () => {
          setShowInviteModal(false);
          setInviteEmail('');
          setInviteMessage('');
        }}]
      );
    }
  }

  async function handleAcceptRequest(requestId: string) {
    const { error } = await acceptRequest(requestId);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Reading request accepted');
    }
  }

  async function handleDeclineRequest(requestId: string) {
    const { error } = await declineRequest(requestId);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Reading request declined');
    }
  }

  async function handleToggleAccess(permissionId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const { error } = await togglePermissionStatus(permissionId, newStatus);
    
    if (error) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleViewFriendData(friend: UserProfile) {
    // Check if we have permission to view this friend's data
    const hasPermission = permissions.some(p => 
      p.viewer_id === user?.id && 
      p.owner_id === friend.id && 
      p.status === 'active'
    );
    
    if (!hasPermission) {
      Alert.alert('Access Denied', 'You do not have permission to view this user\'s health data');
      return;
    }
    
    setSelectedFriend(friend);
    fetchFriendHealthData(friend.id);
  }

  async function fetchFriendHealthData(userId: string) {
    setLoadingHealthData(true);
    
    try {
      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setFriendHealthData(data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch health data');
      setFriendHealthData([]);
    } finally {
      setLoadingHealthData(false);
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getCanViewData = () => {
    const canViewPermissions = permissions.filter(p => 
      p.viewer_id === user?.id && p.status === 'active'
    );
    return canViewPermissions.map(permission => {
      const userProfile = users.find(u => u.id === permission.owner_id);
      return {
        ...userProfile,
        permissionId: permission.id,
        status: 'active',
        canView: true,
        lastActivity: permission.updated_at,
      };
    }).filter(Boolean);
  };

  const getWhoCanViewData = () => {
    const viewerPermissions = permissions.filter(p => p.owner_id === user?.id);
    return viewerPermissions.map(permission => {
      const userProfile = users.find(u => u.id === permission.viewer_id);
      return {
        ...userProfile,
        permissionId: permission.id,
        status: permission.status,
        canView: permission.status === 'active',
        lastActivity: permission.updated_at,
      };
    }).filter(Boolean);
  };

  const getRequestsData = () => {
    const pendingRequests = requests.filter(r => r.status === 'pending');
    const receivedRequests = pendingRequests.filter(r => r.owner_id === user?.id);
    const sentRequests = pendingRequests.filter(r => r.requester_id === user?.id);
    
    return {
      received: receivedRequests.map(request => {
        const userProfile = users.find(u => u.id === request.requester_id);
        return {
          ...userProfile,
          requestId: request.id,
          status: 'pending_received',
          message: request.message,
          lastActivity: request.created_at,
        };
      }).filter(Boolean),
      sent: sentRequests.map(request => {
        const userProfile = users.find(u => u.id === request.owner_id);
        return {
          ...userProfile,
          requestId: request.id,
          status: 'pending_sent',
          message: request.message,
          lastActivity: request.created_at,
        };
      }).filter(Boolean)
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  const canViewData = getCanViewData();
  const whoCanViewData = getWhoCanViewData();
  const requestsData = getRequestsData();

  return (
    <View style={styles.container}>
      <AppHeader />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Access Management</Text>
          <Text style={styles.subtitle}>Request access to view others' health readings</Text>
        </View>
      </View>

      {/* Request Button */}
      <View style={styles.requestButtonContainer}>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => setShowInviteModal(true)}
        >
          <UserPlus size={20} color="#ffffff" />
          <Text style={styles.requestButtonText}>Request</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* I Can View Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('canView')}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: '#3B82F620' }]}>
                <Eye size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>I Can View</Text>
                <Text style={styles.sectionSubtitle}>
                  Health data I have access to ({canViewData.length})
                </Text>
              </View>
            </View>
            {expandedSections.canView ? (
              <ChevronUp size={20} color="#9CA3AF" />
            ) : (
              <ChevronDown size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {expandedSections.canView && (
            <View style={styles.sectionContent}>
              {canViewData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No access granted yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Send requests to view others' health data
                  </Text>
                </View>
              ) : (
                canViewData.map((item) => (
                  <View key={item.id} style={styles.accessItem}>
                    <View style={styles.accessItemLeft}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userInitial}>
                          {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.full_name || 'Unknown User'}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        <Text style={styles.accessDate}>
                          Access granted {formatDate(item.lastActivity)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.accessItemRight}>
                      <TouchableOpacity
                        style={styles.viewDataButton}
                        onPress={() => handleViewFriendData(item)}
                      >
                        <FileText size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Active</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Who Can View Mine Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('whoCanView')}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: '#10B98120' }]}>
                <Shield size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Who Can View Mine</Text>
                <Text style={styles.sectionSubtitle}>
                  People who can view my health data ({whoCanViewData.length})
                </Text>
              </View>
            </View>
            {expandedSections.whoCanView ? (
              <ChevronUp size={20} color="#9CA3AF" />
            ) : (
              <ChevronDown size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {expandedSections.whoCanView && (
            <View style={styles.sectionContent}>
              {whoCanViewData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No viewers yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Accept requests to share your health data
                  </Text>
                </View>
              ) : (
                whoCanViewData.map((item) => (
                  <View key={item.id} style={styles.accessItem}>
                    <View style={styles.accessItemLeft}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userInitial}>
                          {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.full_name || 'Unknown User'}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        <Text style={styles.accessDate}>
                          Access granted {formatDate(item.lastActivity)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.accessItemRight}>
                      <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => handleToggleAccess(item.permissionId, item.status)}
                      >
                        {item.canView ? (
                          <EyeOff size={16} color="#EF4444" />
                        ) : (
                          <Eye size={16} color="#10B981" />
                        )}
                      </TouchableOpacity>
                      <View style={[
                        styles.statusBadge,
                        !item.canView && styles.statusBadgeInactive
                      ]}>
                        <Text style={[
                          styles.statusText,
                          !item.canView && styles.statusTextInactive
                        ]}>
                          {item.canView ? 'Active' : 'Blocked'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Requests Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('requests')}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: '#F59E0B20' }]}>
                <Mail size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Requests</Text>
                <Text style={styles.sectionSubtitle}>
                  Pending access requests ({requestsData.received.length} received, {requestsData.sent.length} sent)
                </Text>
              </View>
            </View>
            {expandedSections.requests ? (
              <ChevronUp size={20} color="#9CA3AF" />
            ) : (
              <ChevronDown size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {expandedSections.requests && (
            <View style={styles.sectionContent}>
              {requestsData.received.length === 0 && requestsData.sent.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No pending requests</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Send or receive requests to share health data
                  </Text>
                </View>
              ) : (
                <>
                  {requestsData.received.map((item) => (
                    <View key={item.requestId} style={styles.accessItem}>
                      <View style={styles.accessItemLeft}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userInitial}>
                            {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.full_name || 'Unknown User'}</Text>
                          <Text style={styles.userEmail}>{item.email}</Text>
                          <Text style={styles.accessDate}>
                            Requested {formatDate(item.lastActivity)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAcceptRequest(item.requestId)}
                        >
                          <Check size={16} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineButton}
                          onPress={() => handleDeclineRequest(item.requestId)}
                        >
                          <X size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  
                  {requestsData.sent.map((item) => (
                    <View key={item.requestId} style={styles.accessItem}>
                      <View style={styles.accessItemLeft}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userInitial}>
                            {item.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.full_name || 'Unknown User'}</Text>
                          <Text style={styles.userEmail}>{item.email}</Text>
                          <Text style={styles.accessDate}>
                            Sent {formatDate(item.lastActivity)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Access</Text>
            <TouchableOpacity onPress={handleSendInvite}>
              <Text style={styles.sendButton}>Send</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.emailInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="friend@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Message (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              value={inviteMessage}
              onChangeText={setInviteMessage}
              placeholder="I'd like to share health data with you..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Friend Health Data Modal */}
      <Modal
        visible={!!selectedFriend}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedFriend(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedFriend(null)}>
              <Text style={styles.cancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedFriend?.full_name}'s Health Data
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingHealthData ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner />
              </View>
            ) : friendHealthData.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No health data available</Text>
              </View>
            ) : (
              friendHealthData.map((data) => {
                const IconComponent = HEALTH_ICONS[data.metric_type];
                const color = HEALTH_COLORS[data.metric_type];
                
                return (
                  <View key={data.id} style={styles.healthDataCard}>
                    <View style={styles.healthDataHeader}>
                      <View style={[styles.healthDataIcon, { backgroundColor: `${color}20` }]}>
                        <IconComponent size={20} color={color} />
                      </View>
                      <View style={styles.healthDataInfo}>
                        <Text style={styles.healthDataType}>
                          {data.metric_type.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={styles.healthDataDate}>
                          {formatDate(data.recorded_at)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.healthDataValue}>
                      {data.value} <Text style={styles.healthDataUnit}>{data.unit}</Text>
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  header: {
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  requestButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingVertical: 20,
    gap: 10,
  },
  requestButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  accessItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  accessDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  accessItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewDataButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
  },
  toggleButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#166534',
  },
  statusTextInactive: {
    color: '#DC2626',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#92400E',
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
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sendButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  emailInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  messageInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
  healthDataCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  healthDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthDataIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  healthDataInfo: {
    flex: 1,
  },
  healthDataType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  healthDataDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  healthDataValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#14B8A6',
  },
  healthDataUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});