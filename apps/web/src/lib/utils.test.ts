import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('skips falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('merges tailwind conflicts (later wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('preserves non-conflicting tailwind classes', () => {
    expect(cn('text-red-500', 'bg-blue-100')).toBe('text-red-500 bg-blue-100');
  });

  it('handles array and object inputs (clsx semantics)', () => {
    expect(cn(['a', 'b'])).toBe('a b');
    expect(cn({ a: true, b: false, c: true })).toBe('a c');
  });
});
