import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ParentalControlsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [controls, setControls] = useState({
    enabled: false,
    pin: '',
    ageRestriction: 18,
    blockedCategories: [],
    restrictAdultContent: true,
    allowedTimeStart: '00:00',
    allowedTimeEnd: '23:59',
  });

  useEffect(() => {
    loadControls();
  }, [user]);

  const loadControls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const controlsRef = doc(firestore, 'parentalControls', user.uid);
      const controlsSnap = await getDoc(controlsRef);

      if (controlsSnap.exists()) {
        setControls(controlsSnap.data());
      }
    } catch (error) {
      console.error('Error loading parental controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveControls = async (newControls) => {
    if (!user) return;

    try {
      setSaving(true);
      const controlsRef = doc(firestore, 'parentalControls', user.uid);
      
      await setDoc(controlsRef, {
        ...newControls,
        updatedAt: serverTimestamp(),
      });

      // Also save to AsyncStorage for quick access
      await AsyncStorage.setItem('parentalControls', JSON.stringify(newControls));
      
      setControls(newControls);
      Alert.alert('Success', 'Parental controls updated successfully');
    } catch (error) {
      console.error('Error saving parental controls:', error);
      Alert.alert('Error', 'Failed to save parental controls');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!controls.enabled && !controls.pin) {
      // First time enabling - need to set PIN
      navigation.navigate('PINSetup', {
        onPINSet: (pin) => {
          const newControls = { ...controls, enabled: true, pin };
          saveControls(newControls);
        },
      });
    } else if (!controls.enabled) {
      // Enabling with existing PIN
      const newControls = { ...controls, enabled: true };
      saveControls(newControls);
    } else {
      // Disabling - require PIN verification
      navigation.navigate('PINEntry', {
        onSuccess: () => {
          const newControls = { ...controls, enabled: false };
          saveControls(newControls);
        },
        title: 'Disable Parental Controls',
        subtitle: 'Enter PIN to disable',
      });
    }
  };

  const handleChangePin = () => {
    navigation.navigate('PINEntry', {
      onSuccess: () => {
        navigation.navigate('PINSetup', {
          onPINSet: (pin) => {
            const newControls = { ...controls, pin };
            saveControls(newControls);
          },
          isChanging: true,
        });
      },
      title: 'Change PIN',
      subtitle: 'Enter current PIN',
    });
  };

  const handleAgeRestrictionChange = () => {
    const ageOptions = [
      { label: 'No Restriction', value: 0 },
      { label: '13+', value: 13 },
      { label: '16+', value: 16 },
      { label: '18+', value: 18 },
    ];

    Alert.alert(
      'Age Restriction',
      'Select age restriction level',
      ageOptions.map(opt => ({
        text: opt.label,
        onPress: () => {
          const newControls = { ...controls, ageRestriction: opt.value };
          saveControls(newControls);
        },
      }))
    );
  };

  const handleToggleAdultContent = () => {
    const newControls = { ...controls, restrictAdultContent: !controls.restrictAdultContent };
    saveControls(newControls);
  };

  const handleManageCategories = () => {
    navigation.navigate('BlockedCategories', {
      blockedCategories: controls.blockedCategories,
      onSave: (categories) => {
        const newControls = { ...controls, blockedCategories: categories };
        saveControls(newControls);
      },
    });
  };

  const handleTimeRestrictions = () => {
    Alert.alert(
      'Time Restrictions',
      'This feature allows you to set specific hours when content can be accessed.',
      [
        { text: 'OK' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading parental controls...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parental Controls</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={colors.primary.purple} />
          <Text style={styles.infoText}>
            Parental controls help you manage what content can be accessed on this device.
          </Text>
        </View>

        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.mainToggle}>
            <View style={styles.toggleLeft}>
              <Ionicons name="lock-closed" size={24} color={controls.enabled ? colors.primary.purple : colors.text.muted} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Enable Parental Controls</Text>
                <Text style={styles.toggleSubtitle}>
                  {controls.enabled ? 'Protection is active' : 'Protection is disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={controls.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.neutral.slate700, true: colors.primary.purple }}
              thumbColor={colors.text.primary}
              disabled={saving}
            />
          </View>
        </View>

        {/* Settings (only show when enabled) */}
        {controls.enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RESTRICTIONS</Text>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleAgeRestrictionChange}
                disabled={saving}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="person-outline" size={22} color={colors.primary.purple} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Age Restriction</Text>
                    <Text style={styles.settingSubtitle}>
                      {controls.ageRestriction === 0 ? 'No restriction' : `${controls.ageRestriction}+`}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="eye-off-outline" size={22} color={colors.primary.purple} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Block Adult Content</Text>
                    <Text style={styles.settingSubtitle}>Hide mature content</Text>
                  </View>
                </View>
                <Switch
                  value={controls.restrictAdultContent}
                  onValueChange={handleToggleAdultContent}
                  trackColor={{ false: colors.neutral.slate700, true: colors.primary.purple }}
                  thumbColor={colors.text.primary}
                  disabled={saving}
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleManageCategories}
                disabled={saving}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="list-outline" size={22} color={colors.primary.purple} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Blocked Categories</Text>
                    <Text style={styles.settingSubtitle}>
                      {controls.blockedCategories.length} categories blocked
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleTimeRestrictions}
                disabled={saving}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="time-outline" size={22} color={colors.primary.purple} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Time Restrictions</Text>
                    <Text style={styles.settingSubtitle}>
                      {controls.allowedTimeStart} - {controls.allowedTimeEnd}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SECURITY</Text>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleChangePin}
                disabled={saving}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="key-outline" size={22} color={colors.primary.purple} />
                  <Text style={styles.settingTitle}>Change PIN</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>How it works:</Text>
          <Text style={styles.helpText}>
            • Set a 4-digit PIN to protect your settings{'\n'}
            • Choose age-appropriate content restrictions{'\n'}
            • Block specific categories or channels{'\n'}
            • Set time limits for content access{'\n'}
            • PIN required to disable or change settings
          </Text>
        </View>
      </ScrollView>
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
    paddingTop: 50,
    paddingBottom: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 12,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  mainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.slate800,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.slate800,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  helpSection: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default ParentalControlsScreen;
