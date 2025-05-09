import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors'; // If you want to use your color constants
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // Set active color to blue for selected tab
        tabBarActiveTintColor: '#4682B4',  // Set to blue or any shade of blue you prefer
        // Optionally adjust inactive color if you want
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault, 
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? '#0000FF' : color} />
          ),
        }}
      />

    <Tabs.Screen
        name="doctors"
        options={{
          title: 'Doctors',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? '#0000FF' : color} />
          ),
        }}
      />
      {/* 
      <Tabs.Screen
        name="appointment"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'notifications-outline'} size={24} color={focused ? '#0000FF' : color} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? '#0000FF' : color} />
          ),
        }}
      />
    </Tabs>
  );
}