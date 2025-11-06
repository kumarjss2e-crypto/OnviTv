import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';

const MoreScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  // Get user display info
  const displayName = userProfile?.displayName || user?.displayName || 'User';
  const email = user?.email || 'user@example.com';
  const photoURL = userProfile?.photoURL || user?.photoURL;
  const subscriptionPlan = userProfile?.subscription?.plan || 'Free Plan';

  const menuItems = [
    { icon: 'list-outline', title: 'My Playlists', subtitle: 'Manage your IPTV sources', screen: 'Playlists' },
    { icon: 'star-outline', title: 'Favorites', subtitle: 'Your favorite content', screen: 'Favorites' },
    { icon: 'download-outline', title: 'Downloads', subtitle: 'Offline content', screen: 'Downloads' },
    { icon: 'time-outline', title: 'Watch History', subtitle: 'Recently watched', screen: 'History' },
    { icon: 'calendar-outline', title: 'Electronic Program Guide', subtitle: 'Browse TV schedule', screen: 'EPG' },
    { icon: 'settings-outline', title: 'Settings', subtitle: 'App preferences', screen: 'Settings' },
    { icon: 'help-circle-outline', title: 'Help & Support', subtitle: 'Get help', screen: 'Support' },
    { icon: 'information-circle-outline', title: 'About', subtitle: 'App information', screen: 'About' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatar}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color={colors.text.primary} />
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{subscriptionPlan}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.muted} style={styles.profileChevron} />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if (item.screen === 'Playlists') {
                  navigation.navigate('PlaylistManagement');
                } else if (item.screen === 'EPG') {
                  navigation.navigate('EPG');
                } else if (item.screen === 'Favorites') {
                  navigation.navigate('Favorites');
                } else if (item.screen === 'Downloads') {
                  navigation.navigate('Downloads');
                } else if (item.screen === 'History') {
                  navigation.navigate('WatchHistory');
                } else if (item.screen === 'Settings') {
                  navigation.navigate('Settings');
                } else if (item.screen === 'Support') {
                  navigation.navigate('HelpSupport');
                } else if (item.screen === 'About') {
                  navigation.navigate('About');
                } else {
                  console.log(`Navigate to ${item.screen}`);
                }
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={22} color={colors.primary.purple} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 32 : 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 12,
  },
  profileChevron: {
    position: 'absolute',
    top: 32,
    right: 20,
  },
  badge: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  version: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default MoreScreen;
