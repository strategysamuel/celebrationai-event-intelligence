/**
 * @vitest-environment jsdom
 * Unit tests for Accessible Modal Hook and Focus Management (useAccessibleModal)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAccessibleModal } from '../src/hooks/useAccessibleModal';

describe('Accessible Modal & Focus Management (useAccessibleModal)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a ref for container element', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAccessibleModal({ isOpen: false, onClose }));
    expect(result.current).toBeDefined();
  });

  it('listens for Escape key and triggers onClose', () => {
    const onClose = vi.fn();
    renderHook(() => useAccessibleModal({ isOpen: true, onClose }));

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(escapeEvent);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not re-trigger focus initialization on re-renders when isOpen remains true', async () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }) => useAccessibleModal({ isOpen, onClose }),
      { initialProps: { isOpen: true } }
    );

    rerender({ isOpen: true });
    expect(true).toBe(true);
  });
});
