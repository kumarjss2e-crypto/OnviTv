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
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  registerForPushNotifications,
  clearAllNotifications,
} from '../services/notificationService';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    enabled: true,
    newContent: true,
    recommendations: true,
    watchReminders: true,
    systemUpdates: true,
    promotions: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const result = await getNotificationPreferences(user.uid);
      if (result.success) {
        setPreferences(result.data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    // If enabling notifications, request permissions
    if (key === 'enabled' && value) {
      const result = await registerForPushNotifications(user.uid);
      if (!result.success) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {/* Open settings */} },
          ]
        );
        setPreferences({ ...preferences, enabled: false });
        return;
      }
    }

    // Save to Firestore
    savePreferences(newPreferences);
  };

  const savePreferences = async (prefs) => {
    try {
      setSaving(true);
      await updateNotificationPreferences(user.uid, prefs);
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
            Alert.alert('Success', 'All notifications cleared');
          },
        },
      ]
    );
  };

  const handleTimeChange = (type, time) => {
    const newPreferences = { ...preferences, [type]: time };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.masterToggle}>
            <View style={styles.toggleInfo}>
              <Ionicons name="notifications" size={28} color={colors.primary.purple} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Enable Notifications</Text>
                <Text style={styles.toggleSubtitle}>
                  Receive updates about new content and more
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={(value) => handleToggle('enabled', value)}
              trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Notification Types */}
        {preferences.enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Types</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="film-outline" size={24} color={colors.text.secondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>New Content</Text>
                    <Text style={styles.settingSubtitle}>
                      New movies, series, and episodes
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.newContent}
                  onValueChange={(value) => handleToggle('newContent', value)}
                  trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="sparkles-outline" size={24} color={colors.text.secondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Recommendations</Text>
                    <Text style={styles.settingSubtitle}>
                      Personalized content suggestions
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.recommendations}
                  onValueChange={(value) => handleToggle('recommendations', value)}
                  trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="time-outline" size={24} color={colors.text.secondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Watch Reminders</Text>
                    <Text style={styles.settingSubtitle}>
                      Continue watching your shows
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.watchReminders}
                  onValueChange={(value) => handleToggle('watchReminders', value)}
                  trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="information-circle-outline" size={24} color={colors.text.secondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>System Updates</Text>
                    <Text style={styles.settingSubtitle}>
                      App updates and maintenance
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.systemUpdates}
                  onValueChange={(value) => handleToggle('systemUpdates', value)}
                  trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="pricetag-outline" size={24} color={colors.text.secondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Promotions</Text>
                    <Text style={styles.settingSubtitle}>
                      Special offers and deals
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.promotions}
                  onValueChange={(value) => handleToggle('promotions', value)}
                  trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Quiet Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quiet Hours</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="moon-outline" size={24} color={colors.text.secondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                    <Text style={styles.settingSubtitle}>
                      Mute notifications during specific hours
                    </Text>
                  </View>
                </View>
                <Switch
                  value={preferences.quietHoursEnabled}
                  onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
                  trackColor={{ false: colors.text.muted, true: colors.primary.purple }}
                  thumbColor="#fff"
                />
              </View>

              {preferences.quietHoursEnabled && (
                <View style={styles.timeContainer}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Start Time</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => {
                        // TODO: Open time picker
                        Alert.alert('Time Picker', 'Time picker would open here');
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.text.primary} />
                      <Text style={styles.timeText}>{preferences.quietHoursStart}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>End Time</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => {
                        // TODO: Open time picker
                        Alert.alert('Time Picker', 'Time picker would open here');
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.text.primary} />
                      <Text style={styles.timeText}>{preferences.quietHoursEnd}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={24} color={colors.accent.red} />
                <Text style={[styles.actionButtonText, { color: colors.accent.red }]}>
                  Clear All Notifications
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary.purple} />
          <Text style={styles.infoText}>
            You can manage notification permissions in your device settings at any time.
          </Text>
        </View>
      </ScrollView>

      {/* Saving Indicator */}
      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={colors.primary.purple} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  toggleTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  timeContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary.purple + '15',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 12,
    lineHeight: 20,
  },
  savingIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  savingText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
  },
});

export default NotificationsScreen;
