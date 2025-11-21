import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
- import { colors } from '../styles/colors';
+ import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserSubscription, updateSubscription } from '../services/subscriptionService';

const SubscriptionScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Available subscription plans
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'forever',
      features: [
        'Limited content access',
        'SD quality streaming',
        '1 device at a time',
        'Ads supported',
      ],
      color: colors.text.muted,
      icon: 'gift-outline',
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      interval: 'month',
      features: [
        'Full content library',
        'HD quality streaming',
        '2 devices at a time',
        'Ad-free experience',
        'Download for offline',
      ],
      color: colors.primary.purple,
      icon: 'star-outline',
      popular: false,
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 14.99,
      interval: 'month',
      features: [
        'Everything in Basic',
        '4K Ultra HD quality',
        '4 devices at a time',
        'Early access to content',
        'Priority support',
        'Family sharing',
      ],
      color: colors.accent.gold,
      icon: 'diamond-outline',
      popular: true,
    },
    {
      id: 'annual',
      name: 'Annual',
      price: 99.99,
      interval: 'year',
      features: [
        'Everything in Premium',
        '2 months free',
        'Exclusive content',
        'VIP support',
        'Gift subscriptions',
      ],
      color: colors.accent.green,
      icon: 'trophy-outline',
      popular: false,
      savings: 'Save $80/year',
    },
  ];

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const result = await getUserSubscription(user.uid);
      if (result.success) {
        setSubscription(result.data);
        setSelectedPlan(result.data.planId || 'free');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || selectedPlan === subscription?.planId) {
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    
    if (plan.price === 0) {
      // Downgrade to free
      Alert.alert(
        'Downgrade to Free',
        'Are you sure you want to downgrade to the free plan? You will lose access to premium features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Downgrade',
            style: 'destructive',
            onPress: () => processSubscriptionChange('free'),
          },
        ]
      );
    } else {
      // Upgrade or change plan
      navigation.navigate('Payment', {
        planId: selectedPlan,
        planName: plan.name,
        price: plan.price,
        interval: plan.interval,
        onSuccess: () => {
          processSubscriptionChange(selectedPlan);
        },
      });
    }
  };

  const processSubscriptionChange = async (planId) => {
    try {
      setLoading(true);
      const result = await updateSubscription(user.uid, planId);
      if (result.success) {
        Alert.alert('Success', 'Your subscription has been updated!');
        loadSubscription();
      } else {
        Alert.alert('Error', result.error || 'Failed to update subscription');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (plan) => {
    const isCurrentPlan = subscription?.planId === plan.id;
    const isSelected = selectedPlan === plan.id;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isCurrentPlan && styles.planCardCurrent,
        ]}
        onPress={() => handleSelectPlan(plan.id)}
        activeOpacity={0.8}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
            <Ionicons name={plan.icon} size={32} color={plan.color} />
          </View>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            {isCurrentPlan && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current Plan</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.planPricing}>
          <Text style={styles.planPrice}>
            ${plan.price.toFixed(2)}
          </Text>
          <Text style={styles.planInterval}>/{plan.interval}</Text>
        </View>

        {plan.savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{plan.savings}</Text>
          </View>
        )}

        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent.green} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && !isCurrentPlan && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary.purple} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
      </View>
    );
  }

  const currentPlan = plans.find(p => p.id === subscription?.planId) || plans[0];
  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const canSubscribe = selectedPlan && selectedPlan !== subscription?.planId;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Subscription Info */}
        <View style={styles.currentSection}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <View style={[styles.currentPlanIcon, { backgroundColor: currentPlan.color + '20' }]}>
                <Ionicons name={currentPlan.icon} size={28} color={currentPlan.color} />
              </View>
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
                <Text style={styles.currentPlanPrice}>
                  ${currentPlan.price.toFixed(2)}/{currentPlan.interval}
                </Text>
              </View>
            </View>
            {subscription?.expiresAt && (
              <Text style={styles.expiryText}>
                {subscription.status === 'active' ? 'Renews' : 'Expires'} on{' '}
                {new Date(subscription.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Available Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>
            Upgrade or downgrade anytime. No commitment.
          </Text>
          {plans.map(plan => renderPlanCard(plan))}
        </View>

        {/* Payment History Link */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('PaymentHistory')}
        >
          <Ionicons name="receipt-outline" size={24} color={colors.text.primary} />
          <Text style={styles.historyButtonText}>Payment History</Text>
          <Ionicons name="chevron-forward" size={24} color={colors.text.muted} />
        </TouchableOpacity>
      </ScrollView>

      {/* Subscribe Button */}
      {canSubscribe && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.subscribeButton, !canSubscribe && styles.subscribeButtonDisabled]}
            onPress={handleSubscribe}
            disabled={!canSubscribe}
          >
            <Text style={styles.subscribeButtonText}>
              {selectedPlanData?.price === 0
                ? 'Downgrade to Free'
                : `Subscribe to ${selectedPlanData?.name}`}
            </Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
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
  currentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  currentPlanCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPlanIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  expiryText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  plansSection: {
    padding: 16,
  },
  planCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary.purple,
  },
  planCardCurrent: {
    borderColor: colors.accent.green,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  currentBadge: {
    backgroundColor: colors.accent.green + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.green,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  planInterval: {
    fontSize: 18,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  savingsBadge: {
    backgroundColor: colors.accent.green + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.green,
  },
  planFeatures: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 100,
    borderRadius: 12,
  },
  historyButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 12,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    padding: 16,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.purple,
    paddingVertical: 16,
    borderRadius: 12,
  },
  subscribeButtonDisabled: {
    backgroundColor: colors.text.muted,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
});

export default SubscriptionScreen;
