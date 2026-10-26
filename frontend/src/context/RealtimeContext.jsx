import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

/**
 * RealtimeContext — manages a single Server-Sent Events connection per session.
 *
 * The EventSource opens once on login and closes on logout.
 * Any component can subscribe to specific event types via `useRealtime()`.
 *
 * Events the backend emits:
 *   connected         — SSE handshake confirmed
 *   notification      — new in-app notification for this user
 *   report_created    — a new report was submitted (broadcast to all)
 *   report_updated    — a report this user owns changed status
 *   dashboard_refresh — admin signal to re-fetch dashboard stats
 */
const RealtimeContext = createContext(null);

const TOKEN_KEY = 'oceanshield_token';
// Max reconnect attempts before giving up
const MAX_RETRIES = 5;
// Base delay for exponential backoff (ms)
const BASE_DELAY = 2000;

export function RealtimeProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const esRef = useRef(null);           // EventSource instance
  const listenersRef = useRef({});      // event → Set of callbacks
  const retryRef = useRef(0);
  const retryTimer = useRef(null);

  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Emit an event to all registered listeners for that type
  const dispatch = useCallback((eventType, data) => {
    const set = listenersRef.current[eventType];
    if (set) set.forEach((cb) => cb(data));
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    // Close any existing connection first
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}/api/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', (e) => {
      retryRef.current = 0;
      setConnected(true);
      dispatch('connected', JSON.parse(e.data));
    });

    es.addEventListener('notification', (e) => {
      const data = JSON.parse(e.data);
      setUnreadCount((n) => n + 1);
      dispatch('notification', data);
    });

    es.addEventListener('report_created', (e) => {
      dispatch('report_created', JSON.parse(e.data));
    });

    es.addEventListener('report_updated', (e) => {
      dispatch('report_updated', JSON.parse(e.data));
    });

    es.addEventListener('dashboard_refresh', (e) => {
      dispatch('dashboard_refresh', JSON.parse(e.data));
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;

      if (retryRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryRef.current);
        retryRef.current += 1;
        retryTimer.current = setTimeout(connect, delay);
      }
    };
  }, [isAuthenticated, dispatch]);

  // Open connection when authenticated, close when logged out
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      // User logged out — clean up everything
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
      setUnreadCount(0);
    }
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [isAuthenticated, user, connect]);

  /**
   * Subscribe to an event type. Returns an unsubscribe function.
   * Usage:
   *   useEffect(() => {
   *     return subscribe('notification', (data) => reload());
   *   }, []);
   */
  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current[eventType]) {
      listenersRef.current[eventType] = new Set();
    }
    listenersRef.current[eventType].add(callback);
    return () => {
      listenersRef.current[eventType]?.delete(callback);
    };
  }, []);

  /**
   * Manually decrement unread count (after user reads notifications).
   */
  const clearUnread = useCallback(() => setUnreadCount(0), []);
  const decrementUnread = useCallback((by = 1) => setUnreadCount((n) => Math.max(0, n - by)), []);

  const value = { connected, unreadCount, subscribe, clearUnread, decrementUnread };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}

export default RealtimeContext;
