import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { usePremiumUpgradePrompt } from '../hooks/subscriptionHooks';
import PremiumUpgradeScreen from '../screens/PremiumUpgradeScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import EPGScreen from '../screens/EPGScreen';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator();

const MainTabsContent = () => {
  const insets = Platform.OS === 'web' ? { bottom: 0 } : useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.neutral.slate900,
          borderTopColor: colors.neutral.slate800,
          borderTopWidth: 1,
          height: 70 + insets.bottom,
          paddingBottom: 12 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Live TV"
        component={LiveTVScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "tv" : "tv-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EPG"
        component={EPGScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "list" : "list-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "menu" : "menu-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainTabs = ({ navigation }) => {
  const { showUpgradePrompt, setShowUpgradePrompt } = usePremiumUpgradePrompt();

  return (
    <View style={{ flex: 1 }}>
      <MainTabsContent />
      
      {/* Premium Upgrade Modal */}
      <Modal
        visible={showUpgradePrompt}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowUpgradePrompt(false)}
      >
        <View style={styles.premiumModalContainer}>
          <TouchableOpacity
            style={styles.closeButtonTop}
            onPress={() => setShowUpgradePrompt(false)}
          >
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <PremiumUpgradeScreen
            navigation={navigation}
            onSkip={() => setShowUpgradePrompt(false)}
            onUpgrade={() => setShowUpgradePrompt(false)}
            isModal={true}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  premiumModalContainer: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  closeButtonTop: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
  },
});


export default MainTabs;
