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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Plus, 
  Heart, 
  Droplets, 
  Thermometer, 
  Scale, 
  Calendar,
  Clock,
  Mic,
  MicOff,
  Trash2,
  Crown,
  X,
} from 'lucide-react-native';
import { useHealthMetrics } from '@/hooks/useHealthMetrics';
import { useSubscription } from '@/hooks/useSubscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AppHeader } from '@/components/AppHeader';
import { VoiceEntryModal } from '@/components/VoiceEntryModal';
import { MetricType, HealthMetricEntry } from '@/lib/types';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

const METRIC_CONFIGS = {
  blood_pressure: {
    title: 'Blood Pressure',
    unit: 'mmHg',
    icon: Heart,
    color: '#EF4444',
    placeholder: '120/80',
    shortName: 'BP',
  },
  blood_glucose: {
    title: 'Blood Glucose',
    unit: 'mg/dL',
    icon: Droplets,
    color: '#3B82F6',
    placeholder: '100',
    shortName: 'BG',
  },
  heart_rate: {
    title: 'Heart Rate',
    unit: 'bpm',
    icon: Heart,
    color: '#F59E0B',
    placeholder: '72',
    shortName: 'HR',
  },
  temperature: {
    title: 'Temperature',
    unit: '°F',
    icon: Thermometer,
    color: '#F97316',
    placeholder: '98.6',
    shortName: 'Temp',
  },
  weight: {
    title: 'Weight',
    unit: 'lbs',
    icon: Scale,
    color: '#8B5CF6',
    placeholder: '150',
    shortName: 'Weight',
  },
};

export default function HealthScreen() {
  const { metrics, loading, addMetric, deleteMetric, getMetricsByType, getLatestMetric } = useHealthMetrics();
  const { getPremiumFeatures } = useSubscription();
  const premiumFeatures = getPremiumFeatures();
  const insets = useSafeAreaInsets();
  
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('blood_pressure');
  const [metricValues, setMetricValues] = useState<Record<MetricType, { value: string; notes: string }>>({
    blood_pressure: { value: '', notes: '' },
    blood_glucose: { value: '', notes: '' },
    heart_rate: { value: '', notes: '' },
    temperature: { value: '', notes: '' },
    weight: { value: '', notes: '' },
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
  });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setMetricValues({
      blood_pressure: { value: '', notes: '' },
      blood_glucose: { value: '', notes: '' },
      heart_rate: { value: '', notes: '' },
      temperature: { value: '', notes: '' },
      weight: { value: '', notes: '' },
    });
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
    });
    setSelectedMetric('blood_pressure');
  };

  const parseVoiceInput = (transcript: string, metricType: MetricType): string | null => {
    return extractMetricValue(transcript, metricType);
  };

  const extractMetricValue = (text: string, metricType: MetricType): string | null => {
    const lowerText = text.toLowerCase();
    
    // Blood pressure pattern (e.g., "120 over 80", "120/80")
    if (metricType === 'blood_pressure') {
      const bpPattern = /(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i;
      const match = lowerText.match(bpPattern);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }
    
    // General number pattern for other metrics
    const numberPattern = /(\d+(?:\.\d+)?)/;
    const match = lowerText.match(numberPattern);
    if (match) {
      return match[1];
    }
    
    return null;
  };

  const handleAddMetric = async () => {
    const metricsToAdd = Object.entries(metricValues)
      .filter(([_, data]) => data.value.trim())
      .map(([type, data]) => ({
        metric_type: type as MetricType,
        value: data.value.trim(),
        unit: METRIC_CONFIGS[type as MetricType].unit,
        notes: data.notes.trim() || undefined,
        recorded_at: new Date(`${formData.date}T${formData.time}`).toISOString(),
      }));

    if (metricsToAdd.length === 0) {
      Alert.alert('Error', 'Please enter at least one health metric value');
      return;
    }

    setSubmitting(true);
    try {
      for (const metric of metricsToAdd) {
        const { error } = await addMetric(metric);
        if (error) {
          Alert.alert('Error', error.message);
          setSubmitting(false);
          return;
        }
      }
      
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', `${metricsToAdd.length} health metric(s) added successfully`);
    } catch (err) {
      Alert.alert('Error', 'Failed to add metrics');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceEntryModal = () => {
    setShowVoiceModal(true);
  };

  const handleVoiceDataParsed = (parsedData: Record<string, string>) => {
    console.log('Voice data parsed, updating form:', parsedData);
    // Update the form with parsed voice data
    setMetricValues(prev => {
      const updated = { ...prev };
      Object.entries(parsedData).forEach(([type, value]) => {
        if (updated[type as MetricType]) {
          updated[type as MetricType] = { 
            ...updated[type as MetricType], 
            value, 
            notes: 'Added via voice' 
          };
        }
      });
      return updated;
    });
    
    // Open the add modal with pre-filled data
    console.log('Opening add modal with pre-filled data');
    setShowVoiceModal(false); // Ensure voice modal is closed first
    setShowAddModal(true);
  };

  const handleDeleteMetric = (id: string) => {
    Alert.alert(
      'Delete Metric',
      'Are you sure you want to delete this health metric?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMetric(id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete metric');
            }
          }
        }
      ]
    );
  };

  const updateMetricValue = (type: MetricType, field: 'value' | 'notes', value: string) => {
    setMetricValues(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    // Don't reset form data immediately to preserve user input
  };

  const handleCloseVoiceModal = () => {
    setShowVoiceModal(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getLatestReading = () => {
    const latest = getLatestMetric(selectedMetric);
    return latest;
  };

  const getRecentReadings = () => {
    return getMetricsByType(selectedMetric).slice(0, 5);
  };

  return (
    <View style={styles.container}>
      <AppHeader scrollY={scrollY} />
      
      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 74 }]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Health Tracking</Text>
          <Text style={styles.subtitle}>Monitor your health metrics</Text>
        </View>

        {/* Add Reading Button */}
        <View style={styles.actionSection}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.voiceEntryButton}
              onPress={handleVoiceEntryModal}
              disabled={false}
            >
              <Mic size={20} color="#3B82F6" />
              <Text style={styles.voiceEntryButtonText}>Voice Entry</Text>
              {!premiumFeatures.voiceEntryForHealthMetrics && (
                <View style={styles.premiumBadge}>
                  <Crown size={12} color="#F59E0B" />
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Reading</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Metric Type Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricTabs}>
          {Object.entries(METRIC_CONFIGS).map(([type, config]) => {
            const IconComponent = config.icon;
            const isSelected = selectedMetric === type;
            
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.metricTab,
                  isSelected && styles.metricTabSelected
                ]}
                onPress={() => setSelectedMetric(type as MetricType)}
              >
                <IconComponent 
                  size={16} 
                  color={isSelected ? '#ffffff' : config.color} 
                />
                <Text style={[
                  styles.metricTabText,
                  isSelected && styles.metricTabTextSelected
                ]}>
                  {config.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Latest Reading Card */}
        {(() => {
          const latest = getLatestReading();
          const config = METRIC_CONFIGS[selectedMetric];
          const IconComponent = config.icon;
          
          return (
            <View style={styles.latestReadingCard}>
              <View style={styles.latestReadingHeader}>
                <View style={[styles.latestReadingIcon, { backgroundColor: `${config.color}15` }]}>
                  <IconComponent size={24} color={config.color} />
                </View>
                <View style={styles.latestReadingInfo}>
                  <Text style={styles.latestReadingTitle}>{config.title}</Text>
                  <Text style={styles.latestReadingSubtitle}>Latest reading</Text>
                </View>
              </View>
              
              <View style={styles.latestReadingValue}>
                <Text style={styles.latestValue}>
                  {latest?.value || '--'}
                </Text>
                <Text style={styles.latestUnit}>
                  {latest?.unit || config.unit}
                </Text>
              </View>
              
              {latest && (
                <Text style={styles.latestDate}>
                  {formatDate(latest.recorded_at)}
                </Text>
              )}
            </View>
          );
        })()}

        {/* Recent Readings */}
        <View style={styles.recentReadingsSection}>
          <Text style={styles.sectionTitle}>Recent Readings</Text>

          {(() => {
            const recentReadings = getRecentReadings();
            
            if (recentReadings.length === 0) {
              return (
                <View style={styles.emptyReadings}>
                  <Text style={styles.emptyReadingsText}>No readings yet</Text>
                  <Text style={styles.emptyReadingsSubtext}>
                    Add your first {METRIC_CONFIGS[selectedMetric].title.toLowerCase()} reading
                  </Text>
                </View>
              );
            }

            return recentReadings.map((reading) => (
              <View key={reading.id} style={styles.readingItem}>
                <View style={styles.readingContent}>
                  <Text style={styles.readingValue}>
                    {reading.value} {reading.unit}
                  </Text>
                  <Text style={styles.readingDate}>
                    {formatDate(reading.recorded_at)}
                  </Text>
                  {reading.notes && (
                    <Text style={styles.readingNotes}>
                      {reading.notes}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteReadingButton}
                  onPress={() => handleDeleteMetric(reading.id)}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ));
          })()}
        </View>
      </Animated.ScrollView>

      {/* Add Readings Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Health Readings</Text>
            <TouchableOpacity
              onPress={handleAddMetric}
              disabled={submitting}
              style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
            >
              {submitting ? (
                <LoadingSpinner size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>
              Enter values for any health metrics
            </Text>

            {/* Date and Time */}
            <View style={styles.dateTimeSection}>
              <View style={styles.dateTimeField}>
                <Text style={styles.inputLabel}>Date</Text>
                <View style={styles.dateTimeInput}>
                  <Calendar size={16} color="#6B7280" />
                  <TextInput
                    style={styles.dateTimeText}
                    value={formData.date}
                    onChangeText={(date) => setFormData(prev => ({ ...prev, date }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              <View style={styles.dateTimeField}>
                <Text style={styles.inputLabel}>Time</Text>
                <View style={styles.dateTimeInput}>
                  <Clock size={16} color="#6B7280" />
                  <TextInput
                    style={styles.dateTimeText}
                    value={formData.time}
                    onChangeText={(time) => setFormData(prev => ({ ...prev, time }))}
                    placeholder="HH:MM"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Metric Inputs */}
            {Object.entries(METRIC_CONFIGS).map(([type, config]) => {
              const IconComponent = config.icon;
              const metricType = type as MetricType;
              const currentValue = metricValues[metricType];
              
              return (
                <View key={type} style={styles.metricInputSection}>
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricInputIcon, { backgroundColor: `${config.color}15` }]}>
                      <IconComponent size={20} color={config.color} />
                    </View>
                    <View style={styles.metricInputInfo}>
                      <Text style={styles.metricInputTitle}>{config.title}</Text>
                      <Text style={styles.metricInputUnit}>Unit: {config.unit}</Text>
                    </View>
                  </View>
                  
                  <TextInput
                    style={styles.metricValueInput}
                    value={currentValue.value}
                    onChangeText={(value) => updateMetricValue(metricType, 'value', value)}
                    placeholder={config.placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={type === 'blood_pressure' ? 'default' : 'numeric'}
                  />
                  
                  <TextInput
                    style={styles.notesInput}
                    value={currentValue.notes}
                    onChangeText={(notes) => updateMetricValue(metricType, 'notes', notes)}
                    placeholder="Notes (optional)"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Voice Entry Modal */}
      <VoiceEntryModal
        visible={showVoiceModal}
        onClose={handleCloseVoiceModal}
        onVoiceDataParsed={handleVoiceDataParsed}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80, // Account for header
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  voiceEntryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3B82F6',
    gap: 10,
    position: 'relative',
  },
  voiceEntryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 24,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  metricTabs: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  metricTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginRight: 16,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  metricTabSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  metricTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  metricTabTextSelected: {
    color: '#ffffff',
  },
  latestReadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  latestReadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  latestReadingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  latestReadingInfo: {
    flex: 1,
  },
  latestReadingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  latestReadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  latestReadingValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  latestValue: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1F2937',
  },
  latestUnit: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 16,
  },
  latestDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  recentReadingsSection: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 24,
  },
  emptyReadings: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyReadingsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyReadingsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  readingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  readingContent: {
    flex: 1,
  },
  readingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  readingDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  readingNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  deleteReadingButton: {
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalSubtitle: {
    fontSize: 17,
    color: '#6B7280',
    marginBottom: 32,
  },
  dateTimeSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  dateTimeField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 17,
    color: '#1F2937',
  },
  metricInputSection: {
    marginBottom: 32,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricInputIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricInputInfo: {
    flex: 1,
  },
  metricInputTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricInputUnit: {
    fontSize: 15,
    color: '#6B7280',
  },
  metricValueInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    fontSize: 17,
    color: '#1F2937',
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    fontSize: 17,
    color: '#1F2937',
    minHeight: 80,
  },
});