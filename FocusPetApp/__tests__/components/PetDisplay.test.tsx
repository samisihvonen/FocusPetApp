import React from 'react';
import { Animated } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PetDisplay from '../../src/components/Pet/PetDisplay';
import { usePetStore } from '../../src/store/usePetStore';

describe('PetDisplay', () => {
  const initialState = usePetStore.getState();
  const makeAnimation = () => ({ start: jest.fn(), stop: jest.fn() } as any);
  let loopSpy: jest.SpyInstance;
  let sequenceSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    loopSpy = jest.spyOn(Animated, 'loop').mockImplementation(() => makeAnimation());
    sequenceSpy = jest
      .spyOn(Animated, 'sequence')
      .mockImplementation(() => makeAnimation());
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => makeAnimation());
  });

  afterEach(() => {
    loopSpy.mockRestore();
    sequenceSpy.mockRestore();
    timingSpy.mockRestore();

    ReactTestRenderer.act(() => {
      usePetStore.setState(initialState, true);
    });
  });

  it('renders pet name and mood label from store', async () => {
    usePetStore.setState({
      name: 'TestiPollo',
      mood: 'sad',
      happiness: 20,
      accessories: ['🎀'],
    });

    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<PetDisplay />);
    });

    const texts = tree!.root.findAllByType('Text').map(node => node.props.children);

    expect(texts).toContain('TestiPollo');
    expect(texts).toContain('😢 Kaipaa huomiota');
    expect(texts).toContain('🎀');

    await ReactTestRenderer.act(() => {
      tree!.unmount();
    });
  });
});
