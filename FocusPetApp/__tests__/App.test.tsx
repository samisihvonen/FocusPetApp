/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('../src/navigation/MainNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MainNavigatorMock() {
    return (
      <View>
        <Text>MainNavigator</Text>
      </View>
    );
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
