import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, LOGOUT_EVENT, tokens } from '../api/client';
import { authApi, userApi } from '../api/endpoints';
import type { MeResponse } from '../api/types';

// ---------- 토스트 ----------
interface Toast { id: number; text: string; code?: string; error: boolean; }
interface ToastApi { ok: (text: string) => void; error: (e: unknown) => void; }
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), t.error ? 6000 : 3000);
  }, []);
  const api = useMemo<ToastApi>(() => ({
    ok: (text) => push({ text, error: false }),
    // 백엔드 에러 코드(POINT409 등)를 같이 보여줘서 어떤 규칙에 걸렸는지 바로 알 수 있게 한다
    error: (e) => push(e instanceof ApiError
      ? { text: e.message, code: e.code, error: true }
      : { text: e instanceof Error ? e.message : String(e), error: true }),
  }), [push]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.error ? ' error' : ''}`}>
            {t.code && <code>{t.code}</code>}{t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider 밖에서 useToast를 썼습니다');
  return ctx;
}

// ---------- 로그인 세션 ----------
interface Session {
  me: MeResponse | null;
  loading: boolean;
  /** 내 정보(포인트 잔액 포함)를 다시 불러온다. 포인트가 바뀌는 행동 뒤에 부른다 */
  refresh: () => Promise<MeResponse | null>;
  login: (email: string, password: string) => Promise<MeResponse | null>;
  logout: () => Promise<void>;
}
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokens.access) { setMe(null); return null; }
    try {
      const data = await userApi.me();
      setMe(data);
      return data;
    } catch {
      setMe(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const onLogout = () => setMe(null);
    window.addEventListener(LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    tokens.set(res.accessToken, res.refreshToken);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* 이미 만료됐어도 로컬 토큰은 지운다 */ }
    tokens.clear();
    setMe(null);
  }, []);

  const value = useMemo(() => ({ me, loading, refresh, login, logout }), [me, loading, refresh, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('SessionProvider 밖에서 useSession을 썼습니다');
  return ctx;
}
