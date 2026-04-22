import { useEffect, useRef } from 'react';

function isEditableTarget(target) {
  if (!target) return false;
  const tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useHotkeys(onMatch, { allowInEditable = false } = {}) {
  const bufferRef = useRef({ keys: '', lastAt: 0 });

  useEffect(() => {
    function handler(event) {
      if (!allowInEditable && isEditableTarget(event.target)) return;

      const now = Date.now();
      const buffer = bufferRef.current;
      if (now - buffer.lastAt > 900) buffer.keys = '';
      buffer.lastAt = now;

      const mod = event.metaKey || event.ctrlKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      const combo = [];
      if (mod) combo.push('mod');
      if (shift) combo.push('shift');
      if (alt) combo.push('alt');
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      combo.push(key);
      const comboStr = combo.join('+');

      if (!mod && !alt && !shift && key.length === 1) {
        buffer.keys = (buffer.keys + key).slice(-4);
      } else {
        buffer.keys = '';
      }

      const matched = onMatch({ combo: comboStr, sequence: buffer.keys, event });
      if (matched) {
        event.preventDefault();
        buffer.keys = '';
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onMatch, allowInEditable]);
}
