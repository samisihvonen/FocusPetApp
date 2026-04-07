import React from 'react';
import { Animated } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import StarBurst from '../../src/components/StarBurst/StarBurst';

describe('StarBurst', () => {
  it('renders celebration text', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <StarBurst scale={new Animated.Value(1)} opacity={new Animated.Value(1)} />,
      );
    });

    const textNodes = tree!.root.findAllByType('Text').map(node => node.props.children);
    expect(textNodes).toContain('⭐✨🌟✨⭐');
    expect(textNodes).toContain('HIENOA! +XP 🎉');
  });
});
