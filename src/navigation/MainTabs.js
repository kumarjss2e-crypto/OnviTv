import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { colors } from '../theme/colors';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import EPGScreen from '../screens/EPGScreen';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
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


export default MainTabs;
