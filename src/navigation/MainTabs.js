import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import MoviesScreen from '../screens/MoviesScreen';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.neutral.slate900,
          borderTopColor: colors.neutral.slate800,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
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
            <TabIcon icon="🏠" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Live TV"
        component={LiveTVScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon="📺" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon="🎬" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon icon="📱" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const TabIcon = ({ icon, focused }) => {
  return (
    <Text
      style={{
        fontSize: 24,
        opacity: focused ? 1 : 0.6,
      }}
    >
      {icon}
    </Text>
  );
};

export default MainTabs;
