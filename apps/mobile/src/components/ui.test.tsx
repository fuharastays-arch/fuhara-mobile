import { fireEvent, render } from '@testing-library/react-native';
import { Button, Notice } from './ui';

describe('mobile UI primitives', () => {
  test('buttons expose accessible labels and invoke actions', () => {
    const onPress = jest.fn();
    const view = render(<Button label="Request booking" onPress={onPress} />);
    fireEvent.press(view.getByRole('button', { name: 'Request booking' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('notices announce changed messages', () => {
    const view = render(
      <Notice tone="error">Those dates are unavailable.</Notice>,
    );
    expect(view.getByText('Those dates are unavailable.')).toBeTruthy();
  });
});
