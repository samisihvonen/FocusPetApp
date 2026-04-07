import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import XPBar from '../../src/components/XPBar/XPBar';

describe('XPBar', () => {
  it('shows level and current xp in level', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<XPBar xp={145} level={3} />);
    });

    const texts = tree!.root.findAllByType('Text').map(node => node.props.children).flat();

    expect(texts).toContain('⚡ Taso ');
    expect(texts).toContain(3);
    expect(texts).toContain(45);
    expect(texts).toContain(' / ');
    expect(texts).toContain(100);
    expect(texts).toContain(' XP');
  });
});
