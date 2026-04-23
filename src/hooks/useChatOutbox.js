import { useEffect, useState } from 'react';
import { lsRead, lsWrite, lsSubscribe } from '../utils/localStore';

const KEY = 'scout_chat_outbox';

export function readOutbox() {
  return lsRead(KEY, []);
}

export function enqueueOutbox(message) {
  const list = readOutbox();
  list.push({ ...message, queuedAt: new Date().toISOString() });
  lsWrite(KEY, list);
}

export function removeFromOutbox(id) {
  lsWrite(KEY, readOutbox().filter((m) => m.id !== id));
}

export function useChatOutbox(onFlush) {
  const [items, setItems] = useState(() => readOutbox());

  useEffect(() => lsSubscribe(KEY, () => setItems(readOutbox())), []);

  useEffect(() => {
    function tryFlush() {
      if (!navigator.onLine) return;
      const queue = readOutbox();
      if (queue.length === 0 || typeof onFlush !== 'function') return;
      queue.forEach((msg) => {
        try {
          onFlush(msg);
          removeFromOutbox(msg.id);
        } catch {
          /* leave queued */
        }
      });
    }
    window.addEventListener('online', tryFlush);
    tryFlush();
    return () => window.removeEventListener('online', tryFlush);
  }, [onFlush]);

  return { items };
}
