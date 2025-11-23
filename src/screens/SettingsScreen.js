import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const SettingsScreen = ({ navigation }) => {
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  const [settings, setSettings] = useState({
    autoPlay: true,
    autoPlayNextEpisode: true,
    videoQuality: 'auto',
    downloadQuality: 'high',
    cellularDownload: false,
    notifications: true,
    parentalControls: false,
    darkMode: true,
    language: 'en',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleQualitySelect = (type, value) => {
    const newSettings = { ...settings, [type]: value };
    saveSettings(newSettings);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Implement cache clearing logic
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: 'High (1080p)', value: 'high' },
    { label: 'Medium (720p)', value: 'medium' },
    { label: 'Low (480p)', value: 'low' },
  ];

  const renderSection = (title, items) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <View key={index}>
          {item.type === 'toggle' && (
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name={item.icon} size={22} color={colors.primary.purple} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggleSetting(item.key)}
                trackColor={{ false: colors.neutral.slate700, true: colors.primary.purple }}
                thumbColor={colors.text.primary}
              />
            </View>
          )}
          
          {item.type === 'select' && (
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => {
                Alert.alert(
                  item.title,
                  'Select quality',
                  qualityOptions.map(opt => ({
                    text: opt.label,
                    onPress: () => handleQualitySelect(item.key, opt.value),
                  }))
                );
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name={item.icon} size={22} color={colors.primary.purple} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingSubtitle}>
                    {qualityOptions.find(o => o.value === settings[item.key])?.label || 'Auto'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          )}

          {item.type === 'button' && (
            <TouchableOpacity
              style={styles.settingItem}
              onPress={item.onPress}
            >
              <View style={styles.settingLeft}>
                <Ionicons name={item.icon} size={22} color={item.danger ? '#ef4444' : colors.primary.purple} />
                <Text style={[styles.settingTitle, item.danger && styles.dangerText]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}>
        {renderSection('Playback', [
          {
            type: 'toggle',
            icon: 'play-circle-outline',
            title: 'Auto Play',
            subtitle: 'Automatically start playing content',
            key: 'autoPlay',
          },
          {
            type: 'toggle',
            icon: 'play-skip-forward-outline',
            title: 'Auto Play Next Episode',
            subtitle: 'Continue to next episode automatically',
            key: 'autoPlayNextEpisode',
          },
          {
            type: 'select',
            icon: 'videocam-outline',
            title: 'Video Quality',
            key: 'videoQuality',
          },
        ])}

        {renderSection('Downloads', [
          {
            type: 'select',
            icon: 'download-outline',
            title: 'Download Quality',
            key: 'downloadQuality',
          },
          {
            type: 'toggle',
            icon: 'cellular-outline',
            title: 'Download over Cellular',
            subtitle: 'Allow downloads using mobile data',
            key: 'cellularDownload',
          },
        ])}

        {renderSection('Notifications', [
          {
            type: 'toggle',
            icon: 'notifications-outline',
            title: 'Push Notifications',
            subtitle: 'Receive updates and recommendations',
            key: 'notifications',
          },
        ])}

        {renderSection('Privacy & Security', [
          {
            type: 'button',
            icon: 'lock-closed-outline',
            title: 'Parental Controls',
            onPress: () => navigation.navigate('ParentalControls'),
          },
        ])}

        {renderSection('Appearance', [
          {
            type: 'toggle',
            icon: 'moon-outline',
            title: 'Dark Mode',
            subtitle: 'Use dark theme',
            key: 'darkMode',
          },
        ])}

        {renderSection('Storage', [
          {
            type: 'button',
            icon: 'trash-outline',
            title: 'Clear Cache',
            onPress: handleClearCache,
          },
        ])}

        {renderSection('About', [
          {
            type: 'button',
            icon: 'document-text-outline',
            title: 'Terms of Service',
            onPress: () => console.log('Terms'),
          },
          {
            type: 'button',
            icon: 'shield-checkmark-outline',
            title: 'Privacy Policy',
            onPress: () => console.log('Privacy'),
          },
          {
            type: 'button',
            icon: 'information-circle-outline',
            title: 'App Version',
            onPress: () => Alert.alert('Version', '1.0.0'),
          },
        ])}

        <View style={styles.footer}>
          <Text style={styles.footerText}>OnviTV v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 14 : 50,
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  dangerText: {
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.text.muted,
  },
});

export default SettingsScreen;

