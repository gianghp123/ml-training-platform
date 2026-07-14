/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useStableValue } from '../useStableValue';

describe('useStableValue', () => {
  it('returns the same reference when the new value is equal by the comparator', () => {
    const a = { items: [1, 2, 3] };
    const b = { items: [1, 2, 3] };

    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value, (x, y) => x.items.length === y.items.length),
      { initialProps: { value: a } }
    );

    const first = result.current;

    rerender({ value: b });

    expect(result.current).toBe(first);
  });

  it('returns a new reference when the comparator reports inequality', () => {
    const a = { count: 1 };
    const b = { count: 2 };

    const { result, rerender } = renderHook(
      ({ value }) => useStableValue(value, (x, y) => x.count === y.count),
      { initialProps: { value: a } }
    );

    const first = result.current;

    rerender({ value: b });

    expect(result.current).not.toBe(first);
    expect(result.current).toBe(b);
  });
});
