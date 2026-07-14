'use client';

import { useEffect, useRef, useState } from 'react';

export function useStableValue<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
  const [stable, setStable] = useState(value);
  const prevRef = useRef(value);

  // Intentionally run on every render: we compare the latest value against
  // the previous one recorded in prevRef. Depending on value alone would
  // close over a stale value; depending on isEqual would defeat the purpose.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isEqual(prevRef.current, value)) {
      prevRef.current = value;
      setStable(value);
    }
  });

  return stable;
}
