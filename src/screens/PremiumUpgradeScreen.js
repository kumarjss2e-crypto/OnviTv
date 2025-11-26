import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import { PLAN_DETAILS, SUBSCRIPTION_PLANS } from '../services/subscriptionService';

const { width, height } = Dimensions.get('window');

const PremiumUpgradeScreen = ({ navigation, onSkip, onUpgrade, isModal = true }) => {
  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS.PREMIUM_MONTHLY);

  const handleUpgrade = () => {
    onUpgrade?.(selectedPlan);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      navigation.replace('Main');
    }
  };

  const FeatureItem = ({ icon, text, included = true }) => (
    <View style={styles.featureItem}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={included ? colors.accent.green : colors.text.muted}
      />
      <Text style={[styles.featureText, !included && styles.featureTextDisabled]}>
        {text}
      </Text>
    </View>
  );

  const PlanCard = ({ plan, isSelected, onSelect }) => {
    const planInfo = PLAN_DETAILS[plan];
    const isYearly = plan === SUBSCRIPTION_PLANS.PREMIUM_YEARLY;

    return (
      <TouchableOpacity
        onPress={() => onSelect(plan)}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
        ]}
      >
        <LinearGradient
          colors={
            isSelected
              ? [colors.primary.purple, colors.primary.indigo]
              : [colors.neutral.slate800, colors.neutral.slate700]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planGradient}
        >
          {isYearly && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>SAVE {planInfo.savings}</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <Text style={styles.planName}>{planInfo.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{planInfo.price}</Text>
              <Text style={styles.period}>{planInfo.period}</Text>
            </View>
          </View>

          <View style={styles.planFeatures}>
            {planInfo.features.map((feature, idx) => (
              <View key={idx} style={styles.planFeatureItem}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.accent.green}
                />
                <Text style={styles.planFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.accent.green}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[colors.neutral.slate900, colors.primary.purple900, colors.neutral.slate900]}
      style={[styles.container, isModal && styles.containerModal]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to all content
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Go Premium?</Text>

          <View style={styles.benefitsContainer}>
            <FeatureItem icon="play-circle" text="Unlimited streaming" />
            <FeatureItem icon="videocam" text="4K quality" />
            <FeatureItem icon="wifi-off" text="Download to watch offline" />
            <FeatureItem icon="ban" text="No ads interruptions" />
            <FeatureItem icon="star" text="Early access to new content" />
            <FeatureItem icon="gift" text="Exclusive collections" />
          </View>
        </View>

        {/* Plans Section */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          <PlanCard
            plan={SUBSCRIPTION_PLANS.PREMIUM_MONTHLY}
            isSelected={selectedPlan === SUBSCRIPTION_PLANS.PREMIUM_MONTHLY}
            onSelect={setSelectedPlan}
          />

          <PlanCard
            plan={SUBSCRIPTION_PLANS.PREMIUM_YEARLY}
            isSelected={selectedPlan === SUBSCRIPTION_PLANS.PREMIUM_YEARLY}
            onSelect={setSelectedPlan}
          />
        </View>

        {/* Free Tier Comparison */}
        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>Comparison</Text>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonRow}>
              <Text style={styles.featureLabel}>Feature</Text>
              <Text style={styles.featureLabel}>Free</Text>
              <Text style={styles.featureLabel}>Premium</Text>
            </View>

            <View style={styles.comparisonDivider} />

            {[
              { feature: 'Streaming', free: 'Limited', premium: 'Unlimited' },
              { feature: 'Video Quality', free: 'SD', premium: '4K' },
              { feature: 'Downloads', free: '5/month', premium: 'Unlimited' },
              { feature: 'Ads', free: 'Yes', premium: 'No' },
              { feature: 'Support', free: 'Community', premium: 'Priority' },
            ].map((item, idx) => (
              <View key={idx} style={styles.comparisonRow}>
                <Text style={styles.featureLabel}>{item.feature}</Text>
                <Text
                  style={[
                    styles.comparisonValue,
                    item.free === 'No' && styles.unavailable,
                  ]}
                >
                  {item.free}
                </Text>
                <Text style={[styles.comparisonValue, styles.available]}>
                  {item.premium}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaText}>
            Cancel anytime. Your first 3 days are free!
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.laterButton}
          onPress={handleSkip}
        >
          <Text style={styles.laterButtonText}>Continue Free</Text>
        </TouchableOpacity>

        <GradientButton
          title="Upgrade Now"
          onPress={handleUpgrade}
          style={styles.upgradeButton}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerModal: {
    flex: 1,
    minHeight: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: 32,
  },
  plansSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  benefitsContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  featureTextDisabled: {
    color: colors.text.muted,
    textDecorationLine: 'line-through',
  },
  planCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary.purple,
  },
  planGradient: {
    padding: 20,
    position: 'relative',
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.accent.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.slate900,
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  period: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  planFeatures: {
    gap: 8,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  comparisonSection: {
    marginBottom: 24,
  },
  comparisonTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  comparisonDivider: {
    height: 1,
    backgroundColor: colors.neutral.slate700,
  },
  featureLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  comparisonValue: {
    flex: 1,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  unavailable: {
    color: colors.accent.red,
  },
  available: {
    color: colors.accent.green,
    fontWeight: '600',
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaText: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    gap: 12,
  },
  laterButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  upgradeButton: {
    width: '100%',
  },
});

export default PremiumUpgradeScreen;
