import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import BrushingTimer from '../../src/components/BrushingTimer/BrushingTimer';

jest.mock('react-native-sound', () => {
  const MockSound = jest.fn(function (
    this: any,
    _filename: string,
    _bundle: string,
    onLoad?: (error: unknown) => void,
  ) {
    this.setNumberOfLoops = jest.fn();
    this.setVolume = jest.fn();
    this.play = jest.fn((cb?: (ok: boolean) => void) => cb?.(true));
    this.stop = jest.fn();
    this.pause = jest.fn();
    this.release = jest.fn();

    if (onLoad) {
      onLoad(null);
    }
  });

  (MockSound as any).MAIN_BUNDLE = 'main_bundle';
  (MockSound as any).setCategory = jest.fn();

  return MockSound;
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

    const button = tree!.root.findByType(TouchableOpacity);

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
      tree = ReactTestRenderer.create(<BrushingTimer autoStartToken={1} />);
    });

    const allText = tree!.root.findAllByType('Text').map(node => node.props.children).flat();

    expect(allText).toContain('⏸️ Tauko');

    await ReactTestRenderer.act(() => {
      tree!.unmount();
    });
  });
});
