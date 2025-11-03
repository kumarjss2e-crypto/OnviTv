import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const AboutScreen = ({ navigation }) => {
  const appVersion = '1.0.0';
  const buildNumber = '100';

  const features = [
    'Live TV & VOD streaming',
    'M3U & Xtream Codes support',
    'Electronic Program Guide (EPG)',
    'Offline downloads',
    'Favorites & watch history',
    'Parental controls',
    'Multi-device sync',
    'Beautiful modern UI',
  ];

  const socialLinks = [
    { icon: 'logo-twitter', title: 'Twitter', url: 'https://twitter.com/onvitv' },
    { icon: 'logo-facebook', title: 'Facebook', url: 'https://facebook.com/onvitv' },
    { icon: 'logo-instagram', title: 'Instagram', url: 'https://instagram.com/onvitv' },
    { icon: 'logo-youtube', title: 'YouTube', url: 'https://youtube.com/@onvitv' },
  ];

  const legalLinks = [
    { icon: 'document-text-outline', title: 'Terms of Service', url: 'https://onvitv.com/terms' },
    { icon: 'shield-checkmark-outline', title: 'Privacy Policy', url: 'https://onvitv.com/privacy' },
    { icon: 'reader-outline', title: 'Licenses', url: 'https://onvitv.com/licenses' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.appInfoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="tv" size={64} color={colors.primary.purple} />
          </View>
          <Text style={styles.appName}>OnviTV</Text>
          <Text style={styles.appTagline}>Your Ultimate IPTV Experience</Text>
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version {appVersion}</Text>
            <Text style={styles.buildText}>Build {buildNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.descriptionText}>
            OnviTV is a modern IPTV player that brings all your favorite content together in one beautiful app. 
            Stream live TV, movies, and series from your IPTV providers with ease.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEATURES</Text>
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary.purple} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FOLLOW US</Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.socialButton}
                onPress={() => Linking.openURL(link.url)}
              >
                <Ionicons name={link.icon} size={28} color={colors.text.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL</Text>
          {legalLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.legalItem}
              onPress={() => Linking.openURL(link.url)}
            >
              <Ionicons name={link.icon} size={22} color={colors.primary.purple} />
              <Text style={styles.legalText}>{link.title}</Text>
              <Ionicons name="open-outline" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ by OnviTV Team</Text>
          <Text style={styles.copyrightText}>© 2024 OnviTV. All rights reserved.</Text>
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
  scrollView: {
    flex: 1,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: colors.text.muted,
    marginRight: 8,
  },
  buildText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  featuresList: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate800,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  legalText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.text.muted,
  },
});

export default AboutScreen;
