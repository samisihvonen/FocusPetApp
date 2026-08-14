import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import NowNextCard from '../src/components/NowNextCard/NowNextCard';
import { fetchWeekCalendar } from '../src/services/wilmaSyncParser';

const sampleNow = {
  id: 't1',
  title: 'Pese hampaat',
  status: 'active',
  steps: [],
  totalXP: 5,
  totalCoins: 1,
  createdAt: new Date().toISOString(),
} as any;

const sampleNext = {
  id: 't2',
  title: 'Pue takki',
  status: 'idle',
  steps: [],
  totalXP: 2,
  totalCoins: 0,
  createdAt: new Date().toISOString(),
} as any;

test('renders NowNextCard with now and next', () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<NowNextCard now={sampleNow} next={sampleNext} />);
  });

  expect(tree?.toJSON()).toBeTruthy();
});

test('renders empty state without tasks', () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<NowNextCard now={null} next={null} />);
  });

  expect(tree?.toJSON()).toBeTruthy();
});

test('demo week calendar includes weekday school and hobby entries without configured URLs', async () => {
  const week = await fetchWeekCalendar(undefined, undefined);
  const schoolDays = week.filter(day => day.lessons.length > 0);
  const hobbyDays = week.filter(day => day.hobbies.length > 0);

  expect(schoolDays.length).toBeGreaterThan(0);
  expect(hobbyDays.length).toBeGreaterThan(0);
  expect(week[0].lessons[0].subject).toBeTruthy();
});
