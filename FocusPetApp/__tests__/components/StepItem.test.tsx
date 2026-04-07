import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import StepItem from '../../src/components/StepItem/StepItem';
import { Step } from '../../src/types';

const baseStep: Step = {
  id: 'step-1',
  order: 1,
  emoji: '🧼',
  description: 'Pese kasvot',
  isDone: false,
  xpReward: 10,
  coinReward: 3,
};

describe('StepItem', () => {
  it('calls onComplete when active step is pressed', async () => {
    const onComplete = jest.fn();
    const sequenceSpy = jest
      .spyOn(Animated, 'sequence')
      .mockReturnValue({ start: (cb?: () => void) => cb?.(), stop: jest.fn() } as any);

    let tree: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <StepItem step={baseStep} onComplete={onComplete} isLocked={false} />,
      );
    });

    const pressable = tree!.root.findByType(TouchableOpacity);

    await ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });

    expect(onComplete).toHaveBeenCalledWith('step-1');
    sequenceSpy.mockRestore();
  });

  it('does not call onComplete when step is locked', async () => {
    const onComplete = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <StepItem step={baseStep} onComplete={onComplete} isLocked />,
      );
    });

    const pressable = tree!.root.findByType(TouchableOpacity);

    await ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
