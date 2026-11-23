// fetch 래퍼: 백엔드 공통 응답({ isSuccess, code, message, result })을 풀고,
// Access Token이 만료되면 Refresh Token으로 한 번 재발급한 뒤 다시 요청한다.

const ACCESS_KEY = 'sikgu.accessToken';
const REFRESH_KEY = 'sikgu.refreshToken';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fieldErrors: { field: string; reason: string }[] = [],
  ) {
    super(message);
  }
}

// 토큰은 탭마다 따로 둔다 (sessionStorage).
// localStorage는 같은 브라우저의 모든 탭이 같이 써서, 다른 탭에서 B로 로그인하면
// A로 보이던 탭의 요청·채팅까지 B 토큰으로 나가 버렸다. 탭마다 다른 계정으로 확인할 수 있게 분리한다.
function read(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch { /* 저장소를 못 쓰면 새로고침 전까지만 로그인 유지 */ }
}
// 예전 버전이 localStorage에 남긴 토큰은 다른 탭과 섞이지 않게 지운다
try { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); } catch { /* 무시 */ }

export const tokens = {
  get access() { return read(ACCESS_KEY); },
  get refresh() { return read(REFRESH_KEY); },
  set(access: string, refresh: string) { write(ACCESS_KEY, access); write(REFRESH_KEY, refresh); },
  clear() { write(ACCESS_KEY, null); write(REFRESH_KEY, null); },
};

/** 로그인이 풀렸을 때(재발급 실패) 앱 전체에 알린다 */
export const LOGOUT_EVENT = 'sikgu:logout';

type Body = unknown | FormData | undefined;

async function send(method: string, path: string, body: Body): Promise<Response> {
  const headers: Record<string, string> = {};
  const access = tokens.access;
  if (access) headers.Authorization = `Bearer ${access}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // Content-Type은 브라우저가 boundary와 함께 넣는다
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  return fetch(path, { method, headers, body: payload });
}

let reissuing: Promise<boolean> | null = null;

/** 동시에 여러 요청이 401을 받아도 재발급은 한 번만 한다 */
function reissueOnce(): Promise<boolean> {
  if (!reissuing) {
    reissuing = (async () => {
      const refreshToken = tokens.refresh;
      if (!refreshToken) return false;
      try {
        const res = await fetch('/api/auth/reissue', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.isSuccess) return false;
        tokens.set(json.result.accessToken, json.result.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => { reissuing = null; });
  }
  return reissuing;
}

export async function api<T>(method: string, path: string, body?: Body): Promise<T> {
  let res: Response;
  try {
    res = await send(method, path, body);
    if (res.status === 401 && tokens.refresh && !path.startsWith('/api/auth/')) {
      if (await reissueOnce()) {
        res = await send(method, path, body);
      }
    }
  } catch {
    throw new ApiError('NETWORK', '서버에 연결할 수 없습니다. 백엔드(8080)가 켜져 있는지 확인해 주세요.', 0);
  }

  const json = await res.json().catch(() => null);
  if (res.ok && json?.isSuccess) {
    return json.result as T;
  }
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    tokens.clear();
    window.dispatchEvent(new Event(LOGOUT_EVENT));
  }
  const errors = json?.result?.errors ?? [];
  const message = errors.length > 0
    ? `${json?.message ?? '요청 값이 올바르지 않습니다.'} (${errors.map((e: { reason: string }) => e.reason).join(', ')})`
    : json?.message ?? (res.status === 502 || res.status === 504
      ? '백엔드 서버에 연결할 수 없습니다. 8080 포트에서 실행 중인지 확인해 주세요.'
      : `요청에 실패했습니다 (HTTP ${res.status})`);
  throw new ApiError(json?.code ?? `HTTP${res.status}`, message, res.status, errors);
}

export const get = <T>(path: string) => api<T>('GET', path);
export const post = <T>(path: string, body?: Body) => api<T>('POST', path, body ?? {});
export const put = <T>(path: string, body?: Body) => api<T>('PUT', path, body ?? {});
export const patch = <T>(path: string, body?: Body) => api<T>('PATCH', path, body ?? {});
export const del = <T>(path: string) => api<T>('DELETE', path);

/** undefined·빈 값은 빼고 쿼리스트링을 만든다 */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}
