import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { importEPGFromXMLTV, importSampleEPG, clearAllEPG } from '../utils/epgImporter';

const EPGImportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [xmltvUrl, setXmltvUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  const showConfirm = (title, message, onConfirm) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  const handleImportFromURL = async () => {
    if (!xmltvUrl.trim()) {
      setStatus('❌ Please enter an XMLTV URL');
      return;
    }

    setLoading(true);
    setStatus('Importing EPG data...');

    try {
      const result = await importEPGFromXMLTV(xmltvUrl, user.uid);
      
      if (result.success) {
        setStatus(`✅ Successfully imported ${result.imported} EPG entries!`);
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        setStatus(`❌ Import failed: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSample = () => {
    showConfirm(
      'Import Sample EPG',
      'This will generate 24 hours of sample EPG data for your channels. Continue?',
      async () => {
        setLoading(true);
        setStatus('Generating sample EPG data...');

        try {
          const result = await importSampleEPG(user.uid);
          
          if (result.success) {
            setStatus(`✅ Successfully imported ${result.imported} sample EPG entries!`);
            setTimeout(() => navigation.goBack(), 2000);
          } else {
            setStatus(`❌ Import failed: ${result.error}`);
          }
        } catch (error) {
          setStatus(`❌ Error: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleClearAll = () => {
    showConfirm(
      'Clear All EPG Data',
      'This will delete ALL EPG data from Firestore. This action cannot be undone. Continue?',
      async () => {
        setLoading(true);
        setStatus('Clearing EPG data...');

        try {
          const result = await clearAllEPG();
          
          if (result.success) {
            setStatus(`✅ Cleared ${result.deleted} EPG entries`);
          } else {
            setStatus(`❌ Clear failed: ${result.error}`);
          }
        } catch (error) {
          setStatus(`❌ Error: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EPG Import</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status */}
        {status ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        {/* Import from XMLTV URL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import from XMLTV URL</Text>
          <Text style={styles.sectionDescription}>
            Enter the URL of an XMLTV EPG file to import program data
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="https://example.com/epg.xml"
            placeholderTextColor={colors.text.muted}
            value={xmltvUrl}
            onChangeText={setXmltvUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleImportFromURL}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color={colors.text.primary} />
                <Text style={styles.buttonText}>Import from URL</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Sample Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Sample Data</Text>
          <Text style={styles.sectionDescription}>
            Create 24 hours of sample EPG data for testing purposes
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleImportSample}
            disabled={loading}
          >
            <Ionicons name="flask-outline" size={20} color={colors.primary.purple} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Generate Sample EPG
            </Text>
          </TouchableOpacity>
        </View>

        {/* Popular XMLTV Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular XMLTV Sources</Text>
          <Text style={styles.sectionDescription}>
            Some popular EPG providers (check their terms of use)
          </Text>

          <View style={styles.sourcesList}>
            <View style={styles.sourceItem}>
              <Ionicons name="globe-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.sourceText}>EPG.best - https://epg.best/</Text>
            </View>
            <View style={styles.sourceItem}>
              <Ionicons name="globe-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.sourceText}>IPTV-EPG - https://iptv-epg.com/</Text>
            </View>
            <View style={styles.sourceItem}>
              <Ionicons name="globe-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.sourceText}>EPG.pw - https://epg.pw/</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <Text style={styles.sectionDescription}>
            Permanently delete all EPG data from Firestore
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearAll}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color={colors.accent.red} />
            <Text style={[styles.buttonText, styles.dangerButtonText]}>
              Clear All EPG Data
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{confirmTitle}</Text>
            <Text style={styles.modalMessage}>{confirmMessage}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  setShowConfirmModal(false);
                  if (confirmAction) confirmAction();
                }}
              >
                <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 14 : 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary.purple,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.purple,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  secondaryButtonText: {
    color: colors.primary.purple,
  },
  dangerButtonText: {
    color: colors.accent.red,
  },
  sourcesList: {
    gap: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: colors.accent.red + '30',
    paddingTop: 24,
  },
  dangerTitle: {
    color: colors.accent.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.neutral.slate900,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.neutral.slate800,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.neutral.slate800,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary.purple,
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  modalButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default EPGImportScreen;
