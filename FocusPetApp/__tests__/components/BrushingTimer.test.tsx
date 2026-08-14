import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import BrushingTimer from '../../src/components/BrushingTimer/BrushingTimer';

// Stub react-native-sound for tests (no native binaries in CI)
jest.mock('react-native-sound', () => {
  return jest.fn().mockImplementation(() => ({
    setNumberOfLoops: jest.fn(),
    setVolume: jest.fn(),
    play: jest.fn((cb?: (ok: boolean) => void) => cb?.(true)),
    stop: jest.fn(),
    pause: jest.fn(),
    release: jest.fn(),
  }));
});

describe('BrushingTimer', () => {
  const makeAnimation = () => ({ start: jest.fn(), stop: jest.fn() } as any);
  let loopSpy: jest.SpyInstance;
  let sequenceSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;
  let delaySpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    loopSpy = jest.spyOn(Animated, 'loop').mockImplementation(() => makeAnimation());
    sequenceSpy = jest
      .spyOn(Animated, 'sequence')
      .mockImplementation(() => makeAnimation());
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => makeAnimation());
    delaySpy = jest.spyOn(Animated, 'delay').mockImplementation(() => makeAnimation());
  });

  afterEach(() => {
    loopSpy.mockRestore();
    sequenceSpy.mockRestore();
    timingSpy.mockRestore();
    delaySpy.mockRestore();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('starts timer on button press and completes after 2 minutes', async () => {
    const onComplete = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<BrushingTimer onComplete={onComplete} />);
    });

    const buttons = tree!.root.findAllByType(TouchableOpacity);
    const button = buttons[0];

    await ReactTestRenderer.act(() => {
      button.props.onPress();
    });

    await ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(121000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(() => {
      tree!.unmount();
    });
  });

  it('auto starts when autoStartToken changes', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<BrushingTimer />);
    });

    await ReactTestRenderer.act(() => {
      tree.update(<BrushingTimer autoStartToken={1} />);
    });

    // Ensure effects and state updates have flushed
    await ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(0);
    });

    const buttons = tree!.root.findAllByType(TouchableOpacity);
    const primaryButtonText = buttons[0].findByType('Text').props.children;

    expect(primaryButtonText).toBe('⏸️ Tauko');

    await ReactTestRenderer.act(() => {
      tree!.unmount();
    });
  });
});
