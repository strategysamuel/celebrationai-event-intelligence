/**
 * @vitest-environment jsdom
 * Unit and Component tests for Accessible Modal Hook and Focus Management (useAccessibleModal)
 */

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAccessibleModal } from '../src/hooks/useAccessibleModal';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (name: string) => void;
}

const TestModalComponent: React.FC<TestModalProps> = ({ isOpen, onClose, onSave }) => {
  const modalRef = useAccessibleModal({ isOpen, onClose });
  const [eventName, setEventName] = useState('Initial Wedding');

  if (!isOpen) return null;

  return (
    <div ref={modalRef} tabIndex={-1} aria-modal="true" role="dialog">
      <button aria-label="Close" onClick={onClose}>X</button>
      <h2>Create Celebration</h2>
      <input
        aria-label="Event Name"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
      />
      <button onClick={() => onSave?.(eventName)}>Save</button>
    </div>
  );
};

describe('Accessible Modal & Focus Management (useAccessibleModal)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets initial focus on the first focusable element when opened', async () => {
    const onClose = vi.fn();
    render(<TestModalComponent isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      const closeBtn = screen.getByLabelText('Close');
      expect(document.activeElement).toBe(closeBtn);
    });
  });

  it('retains focus in Event Name input during typing and re-renders without focus jumping', async () => {
    const onClose = vi.fn();
    render(<TestModalComponent isOpen={true} onClose={onClose} />);

    const input = screen.getByLabelText('Event Name') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    // Simulate typing multiple characters (triggering state updates & re-renders)
    fireEvent.change(input, { target: { value: 'Chennai Traditional Wedding' } });
    expect(input.value).toBe('Chennai Traditional Wedding');
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'Chennai Traditional Wedding 2027' } });
    expect(input.value).toBe('Chennai Traditional Wedding 2027');
    expect(document.activeElement).toBe(input);
  });

  it('triggers onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<TestModalComponent isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
