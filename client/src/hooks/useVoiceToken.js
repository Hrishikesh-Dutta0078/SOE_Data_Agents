import { useState, useCallback, useRef } from 'react';

/**
 * Fetches and caches Azure Speech auth tokens from the server.
 * Tokens have a 10-min TTL; this hook refreshes when < 60s remaining.
 */
export default function useVoiceToken() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tokenRef = useRef({ token: null, region: null, expiresAt: 0 });

  const getToken = useCallback(async () => {
    const now = Date.now();
    const cached = tokenRef.current;

    if (cached.token && cached.expiresAt - now > 60_000) {
      return { token: cached.token, region: cached.region };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useVoiceToken] Fetching token from /api/voice/token...');
      const res = await fetch('/api/voice/token', { credentials: 'include' });
      console.log('[useVoiceToken] Response status:', res.status);
      if (!res.ok) {
        const text = await res.text();
        console.error('[useVoiceToken] Error response body:', text);
        throw new Error(`Token request failed: ${res.status}`);
      }
      const data = await res.json();
      console.log('[useVoiceToken] Token received, region:', data.region);
      tokenRef.current = {
        token: data.token,
        region: data.region,
        expiresAt: data.expiresAt,
      };
      return { token: data.token, region: data.region };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getToken, loading, error };
}
