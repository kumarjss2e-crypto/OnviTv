import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const HelpSupportScreen = ({ navigation }) => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      question: 'How do I add a playlist?',
      answer: 'Go to More → My Playlists → Add Playlist. You can add M3U/M3U8 URLs or Xtream Codes credentials.',
    },
    {
      question: 'Why is my playlist not loading?',
      answer: 'Check your internet connection and verify the playlist URL or credentials are correct. Some providers may have temporary issues.',
    },
    {
      question: 'How do I download content for offline viewing?',
      answer: 'Navigate to a movie or episode, tap the download icon. Downloads can be managed in More → Downloads.',
    },
    {
      question: 'How do I set up parental controls?',
      answer: 'Go to More → Settings → Parental Controls. Set a 4-digit PIN and configure age restrictions and blocked categories.',
    },
    {
      question: 'Can I watch on multiple devices?',
      answer: 'Yes! Your playlists and favorites sync across all devices where you\'re logged in with the same account.',
    },
    {
      question: 'How do I change video quality?',
      answer: 'Go to More → Settings → Video Quality. You can choose Auto, High (1080p), Medium (720p), or Low (480p).',
    },
    {
      question: 'What formats are supported?',
      answer: 'OnviTV supports M3U, M3U8, and Xtream Codes API for playlists. Video formats include MP4, MKV, HLS, and DASH.',
    },
    {
      question: 'How do I report a bug?',
      answer: 'Use the "Report a Bug" option below or email us at support@onvitv.com with details about the issue.',
    },
  ];

  const contactOptions = [
    {
      icon: 'mail-outline',
      title: 'Email Support',
      subtitle: 'support@onvitv.com',
      onPress: () => Linking.openURL('mailto:support@onvitv.com'),
    },
    {
      icon: 'logo-twitter',
      title: 'Twitter',
      subtitle: '@OnviTV',
      onPress: () => Linking.openURL('https://twitter.com/onvitv'),
    },
    {
      icon: 'chatbubble-outline',
      title: 'Live Chat',
      subtitle: 'Chat with our team',
      onPress: () => Alert.alert('Coming Soon', 'Live chat will be available in a future update.'),
    },
    {
      icon: 'bug-outline',
      title: 'Report a Bug',
      subtitle: 'Help us improve',
      onPress: () => Linking.openURL('mailto:support@onvitv.com?subject=Bug Report'),
    },
  ];

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACT US</Text>
          {contactOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactItem}
              onPress={option.onPress}
            >
              <View style={styles.contactLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon} size={22} color={colors.primary.purple} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>{option.title}</Text>
                  <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(index)}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
              {expandedFAQ === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK LINKS</Text>
          
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => Linking.openURL('https://onvitv.com/docs')}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary.purple} />
            <Text style={styles.linkText}>Documentation</Text>
            <Ionicons name="open-outline" size={18} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => Linking.openURL('https://onvitv.com/tutorials')}
          >
            <Ionicons name="play-circle-outline" size={22} color={colors.primary.purple} />
            <Text style={styles.linkText}>Video Tutorials</Text>
            <Ionicons name="open-outline" size={18} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => Linking.openURL('https://community.onvitv.com')}
          >
            <Ionicons name="people-outline" size={22} color={colors.primary.purple} />
            <Text style={styles.linkText}>Community Forum</Text>
            <Ionicons name="open-outline" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpBox}>
          <Ionicons name="information-circle" size={24} color={colors.primary.purple} />
          <Text style={styles.helpText}>
            Can't find what you're looking for? Our support team is here to help 24/7.
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.slate800,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
  },
  faqItem: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate800,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 12,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  helpText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default HelpSupportScreen;
