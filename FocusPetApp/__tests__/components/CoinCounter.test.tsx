import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import CoinCounter from '../../src/components/CoinCounter/CoinCounter';

describe('CoinCounter', () => {
  it('renders coin icon and value', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<CoinCounter coins={42} />);
    });

    const textNodes = tree!.root.findAllByType('Text');
    const values = textNodes.map(node => node.props.children);

    expect(values).toContain('🪙');
    expect(values).toContain(42);
  });
});
