import { useEffect, useCallback } from 'react';

/**
 * useKeyboardShortcuts - Global keyboard shortcuts hook
 *
 * @param {Object} shortcuts - Map of shortcut keys to callbacks
 *   - Key format: 'ctrl+n', 'meta+k', 'escape', etc.
 *   - Value: callback function
 * @param {boolean} enabled - Whether shortcuts are active (default: true)
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+n': () => openQuickCapture(),
 *   'escape': () => closeModal(),
 * });
 */
const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields (except for specific keys)
      const isInputElement =
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable;

      // Build the shortcut key string
      const keys = [];
      if (event.ctrlKey) keys.push('ctrl');
      if (event.metaKey) keys.push('meta');
      if (event.altKey) keys.push('alt');
      if (event.shiftKey) keys.push('shift');

      // Add the actual key (lowercase)
      const key = event.key.toLowerCase();
      if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
        keys.push(key);
      }

      const shortcutKey = keys.join('+');

      // Check if this shortcut exists
      const handler = shortcuts[shortcutKey];
      if (handler) {
        // For Ctrl+N and other capture shortcuts, allow even in inputs
        const allowInInput = ['ctrl+n', 'meta+n'].includes(shortcutKey);

        if (!isInputElement || allowInInput) {
          event.preventDefault();
          handler(event);
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};

/**
 * useQuickCaptureShortcut - Specific hook for quick capture shortcut
 *
 * @param {Function} onTrigger - Callback when Ctrl+N (or Cmd+N) is pressed
 * @param {boolean} enabled - Whether shortcut is active
 */
export const useQuickCaptureShortcut = (onTrigger, enabled = true) => {
  useKeyboardShortcuts(
    {
      'ctrl+n': onTrigger,
      'meta+n': onTrigger, // For Mac users
    },
    enabled
  );
};

export default useKeyboardShortcuts;
