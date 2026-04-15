import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import AdminScreen from '../screens/AdminScreen/AdminScreen';
import TaskBreakerScreen from '../screens/TaskBreakerScreen/TaskBreakerScreen';
import FocusModeScreen from '../screens/FocusModeScreen/FocusModeScreen';
import WeekCalendarScreen from '../screens/WeekCalendarScreen/WeekCalendarScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="TaskBreaker" component={TaskBreakerScreen} />
      <Stack.Screen
        name="FocusMode"
        component={FocusModeScreen}
        options={{ gestureEnabled: false }} // Prevent swipe-back in Focus Mode
      />
      <Stack.Screen name="WeekCalendar" component={WeekCalendarScreen} />
    </Stack.Navigator>
  );
}