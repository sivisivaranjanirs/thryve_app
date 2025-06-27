import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bug, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { SupabaseDebugger } from '@/lib/debug';
import * as Sentry from '@sentry/react';

const { logger } = Sentry;

interface DiagnosticResults {
  supabaseConnection: boolean;
  edgeFunctionsTTS: boolean;
  edgeFunctionsSTT: boolean;
  environmentVariables: boolean;
}

export function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    logger.info('User initiated diagnostic');
    
    try {
      SupabaseDebugger.logEnvironmentInfo();
      const results = await SupabaseDebugger.runFullDiagnostic();
      setDiagnosticResults(results);
    } catch (error) {
      logger.error('Diagnostic failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      Sentry.captureException(error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertCircle size={16} color="#F59E0B" />;
    return status ? <CheckCircle size={16} color="#10B981" /> : <XCircle size={16} color="#EF4444" />;
  };

  const getStatusText = (status: boolean | undefined) => {
    if (status === undefined) return 'Not tested';
    return status ? 'Working' : 'Failed';
  };

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return '#F59E0B';
    return status ? '#10B981' : '#EF4444';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => setVisible(true)}
      >
        <Bug size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Debug Panel</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment Information</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Supabase URL:</Text>
                <Text style={styles.infoValue}>
                  {process.env.EXPO_PUBLIC_SUPABASE_URL ? 
                    `${process.env.EXPO_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 
                    'Not configured'
                  }
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Anon Key:</Text>
                <Text style={styles.infoValue}>
                  {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 
                    `${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                    'Not configured'
                  }
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Platform:</Text>
                <Text style={styles.infoValue}>Web</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Connection Tests</Text>
                <TouchableOpacity
                  style={[styles.testButton, isRunning && styles.testButtonDisabled]}
                  onPress={runDiagnostic}
                  disabled={isRunning}
                >
                  <Text style={styles.testButtonText}>
                    {isRunning ? 'Testing...' : 'Run Tests'}
                  </Text>
                </TouchableOpacity>
              </View>

              {diagnosticResults && (
                <View style={styles.resultsContainer}>
                  <View style={styles.resultItem}>
                    {getStatusIcon(diagnosticResults.environmentVariables)}
                    <Text style={styles.resultLabel}>Environment Variables</Text>
                    <Text style={[styles.resultStatus, { color: getStatusColor(diagnosticResults.environmentVariables) }]}>
                      {getStatusText(diagnosticResults.environmentVariables)}
                    </Text>
                  </View>

                  <View style={styles.resultItem}>
                    {getStatusIcon(diagnosticResults.supabaseConnection)}
                    <Text style={styles.resultLabel}>Supabase Connection</Text>
                    <Text style={[styles.resultStatus, { color: getStatusColor(diagnosticResults.supabaseConnection) }]}>
                      {getStatusText(diagnosticResults.supabaseConnection)}
                    </Text>
                  </View>

                  <View style={styles.resultItem}>
                    {getStatusIcon(diagnosticResults.edgeFunctionsTTS)}
                    <Text style={styles.resultLabel}>TTS Edge Function</Text>
                    <Text style={[styles.resultStatus, { color: getStatusColor(diagnosticResults.edgeFunctionsTTS) }]}>
                      {getStatusText(diagnosticResults.edgeFunctionsTTS)}
                    </Text>
                  </View>

                  <View style={styles.resultItem}>
                    {getStatusIcon(diagnosticResults.edgeFunctionsSTT)}
                    <Text style={styles.resultLabel}>STT Edge Function</Text>
                    <Text style={[styles.resultStatus, { color: getStatusColor(diagnosticResults.edgeFunctionsSTT) }]}>
                      {getStatusText(diagnosticResults.edgeFunctionsSTT)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Troubleshooting Tips</Text>
              <View style={styles.tipContainer}>
                <Text style={styles.tipTitle}>If Edge Functions are failing:</Text>
                <Text style={styles.tipText}>
                  1. Check that your ELEVENLABS_API_KEY is set in Supabase Edge Functions secrets
                </Text>
                <Text style={styles.tipText}>
                  2. Verify the functions are deployed: `supabase functions deploy elevenlabs-tts`
                </Text>
                <Text style={styles.tipText}>
                  3. Check the Edge Function logs in your Supabase dashboard
                </Text>
              </View>

              <View style={styles.tipContainer}>
                <Text style={styles.tipTitle}>If no logs appear:</Text>
                <Text style={styles.tipText}>
                  1. Try using the voice features to trigger function calls
                </Text>
                <Text style={styles.tipText}>
                  2. Check the "Logs" tab for each specific function
                </Text>
                <Text style={styles.tipText}>
                  3. Look for real-time logs while testing
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  testButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultLabel: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipContainer: {
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    paddingLeft: 8,
  },
});