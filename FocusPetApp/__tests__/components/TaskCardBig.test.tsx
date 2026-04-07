import React from 'react';
import { TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import TaskCardBig from '../../src/components/TaskCardBig/TaskCardBig';
import { Task } from '../../src/types';

function createTask(title: string): Task {
  return {
    id: 'task-1',
    title,
    status: 'idle',
    createdAt: new Date().toISOString(),
    totalXP: 10,
    totalCoins: 5,
    steps: [
      {
        id: 'step-1',
        order: 1,
        emoji: '📚',
        description: 'Tee tehtava',
        isDone: false,
        xpReward: 10,
        coinReward: 5,
      },
    ],
  };
}

describe('TaskCardBig', () => {
  it('renders category and time slot for timed task', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <TaskCardBig task={createTask('14:00 - Tee läksyt')} onPress={jest.fn()} />,
      );
    });

    const textNodes = tree!.root.findAllByType('Text').map(node => node.props.children);

    expect(textNodes).toContain('PAIVA');
    expect(textNodes).toContain('OPISKELU');
  });

  it('calls onPress with the given task', async () => {
    const task = createTask('Siivoa huone');
    const onPress = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<TaskCardBig task={task} onPress={onPress} />);
    });

    const pressable = tree!.root.findByType(TouchableOpacity);

    await ReactTestRenderer.act(() => {
      pressable.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(task);
  });
});
