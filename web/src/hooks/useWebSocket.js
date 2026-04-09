import { useEffect, useState, useRef, useCallback } from 'react';
import { isDemoMode } from '../api/demoAdapter';

const DEMO_SEED = () => {
  const t = Date.now();
  return [
    {
      id: 'demo-m1',
      text: 'Hey — can we add one more hero variant before launch?',
      sender_id: 2,
      sender_name: 'Jordan (Client)',
      role: 'client',
      created_at: new Date(t - 3_700_000).toISOString(),
    },
    {
      id: 'demo-m-ai1',
      text: 'Reminder: Milestone 2 (“Homepage concepts”) is due in 3 days.',
      sender_id: -1,
      sender_name: 'FreelanceOS AI',
      role: 'ai_public',
      created_at: new Date(t - 3_650_000).toISOString(),
    },
    {
      id: 'demo-m2',
      text: 'Yes, happy to scope that. I’ll send a mini change order.',
      sender_id: 1,
      sender_name: 'Demo Freelancer',
      role: 'freelancer',
      created_at: new Date(t - 3_500_000).toISOString(),
    },
    {
      id: 'demo-m-ai2',
      text: 'Tip: The client’s last message may touch scope — review revision limits before committing.',
      sender_id: -2,
      sender_name: 'FreelanceOS AI',
      role: 'ai_private',
      created_at: new Date(t - 3_480_000).toISOString(),
    },
  ];
};

/**
 * Chat WebSocket — aligns with backend events: history, message, scope_alert.
 * Demo mode: no socket; local seeded thread + optimistic send.
 */
export function useWebSocket(projectId, onScopeAlert) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onScopeAlertRef = useRef(onScopeAlert);
  onScopeAlertRef.current = onScopeAlert;

  const sendMessage = useCallback((text) => {
    if (isDemoMode()) {
      const msg = {
        id: `demo-local-${Date.now()}`,
        text,
        sender_id: 1,
        sender_name: 'Demo Freelancer',
        role: 'freelancer',
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, msg]);
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text }));
    }
  }, []);

  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      setConnected(false);
      wsRef.current = null;
      return undefined;
    }

    if (isDemoMode()) {
      setMessages(DEMO_SEED());
      setConnected(true);
      return undefined;
    }

    setConnected(false);
    setMessages([]);

    const token = localStorage.getItem('fos_token');
    const base = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000').replace(/\/$/, '');
    const url = `${base}/ws/chat/${projectId}?token=${encodeURIComponent(token || '')}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'history' && Array.isArray(data.payload)) {
          setMessages(data.payload);
          return;
        }
        if (data.type === 'message' && data.payload) {
          setMessages((m) => [...m, data.payload]);
          return;
        }
        if (data.type === 'scope_alert' && data.payload && onScopeAlertRef.current) {
          onScopeAlertRef.current(data.payload);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [projectId]);

  return { messages, connected, sendMessage };
}
