import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { signOut } from '../services/authService';

const MoreScreen = ({ navigation }) => {
  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const menuItems = [
    { icon: '📋', title: 'My Playlists', subtitle: 'Manage your IPTV sources', screen: 'Playlists' },
    { icon: '⭐', title: 'Favorites', subtitle: 'Your favorite content', screen: 'Favorites' },
    { icon: '⬇️', title: 'Downloads', subtitle: 'Offline content', screen: 'Downloads' },
    { icon: '🕐', title: 'Watch History', subtitle: 'Recently watched', screen: 'History' },
    { icon: '💳', title: 'Subscription', subtitle: 'Manage your plan', screen: 'Subscription' },
    { icon: '⚙️', title: 'Settings', subtitle: 'App preferences', screen: 'Settings' },
    { icon: '❓', title: 'Help & Support', subtitle: 'Get help', screen: 'Support' },
    { icon: 'ℹ️', title: 'About', subtitle: 'App information', screen: 'About' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.name}>User Name</Text>
          <Text style={styles.email}>user@example.com</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Free Plan</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                // Navigation will be implemented later
                console.log(`Navigate to ${item.screen}`);
              }}
            >
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
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
    paddingVertical: 32,
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
  },
  avatarText: {
    fontSize: 40,
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
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuIconText: {
    fontSize: 20,
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
  menuArrow: {
    fontSize: 24,
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
    backgroundColor: colors.neutral.slate800,
  },
  logoutIcon: {
    fontSize: 20,
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
