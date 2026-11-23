import { useEffect, useState } from 'react';
import { locationApi, userApi } from '../api/endpoints';
import { useSession, useToast } from '../lib/session';

const isLat = (v: number) => Number.isFinite(v) && v >= -90 && v <= 90;
const isLng = (v: number) => Number.isFinite(v) && v >= -180 && v <= 180;

/**
 * 집 위치 설정 — 가입 3단계, 홈 '변경', 마이페이지에서 쓴다.
 * 위도·경도를 넣거나 '현재 위치'를 누르면 백엔드(GET /api/locations/dong)가 동 이름을 찾아 채운다.
 * 동 이름은 좌표로만 정해지고 직접 고칠 수 없다.
 */
export default function LocationPicker({ onDone, submitLabel = '이 동네로 설정' }: {
  onDone?: () => void; submitLabel?: string;
}) {
  const { me, refresh } = useSession();
  const toast = useToast();
  const current = me?.location;
  const [lat, setLat] = useState(current ? String(current.latitude) : '');
  const [lng, setLng] = useState(current ? String(current.longitude) : '');
  /** 지금 입력된 좌표로 찾은 동 이름. 좌표가 바뀌면 다시 찾는다 */
  const [dong, setDong] = useState<{ name: string; lat: number; lng: number } | null>(
    current ? { name: current.dongName, lat: current.latitude, lng: current.longitude } : null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const valid = lat.trim() !== '' && lng.trim() !== '' && isLat(latNum) && isLng(lngNum);
  const resolved = dong !== null && valid && dong.lat === latNum && dong.lng === lngNum;

  // 좌표 입력이 멈추면(0.6초) 동 이름을 찾는다
  useEffect(() => {
    if (!valid || resolved) return;
    let alive = true;
    setLookupError(null);
    const timer = setTimeout(() => {
      setLooking(true);
      locationApi.lookupDong(latNum, lngNum)
        .then((r) => { if (alive) setDong({ name: r.dongName, lat: latNum, lng: lngNum }); })
        .catch((e) => { if (alive) { setDong(null); setLookupError(e instanceof Error ? e.message : String(e)); } })
        .finally(() => { if (alive) setLooking(false); });
    }, 600);
    return () => { alive = false; clearTimeout(timer); };
  }, [latNum, lngNum, valid, resolved]);

  const useGps = () => {
    if (!navigator.geolocation) { toast.error(new Error('이 브라우저는 위치 기능을 지원하지 않아요')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); },
      () => toast.error(new Error('위치 권한이 없어 현재 위치를 가져오지 못했어요')),
    );
  };

  const submit = async () => {
    if (!resolved || !dong) return;
    setBusy(true);
    try {
      await userApi.setLocation(dong.name, dong.lat, dong.lng);
      await refresh(); // 내 위치가 바뀌면 홈 목록이 새 동네 기준으로 다시 불러온다
      toast.ok(`동네를 ${dong.name}(으)로 설정했어요`);
      onDone?.();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const dongText = !valid ? '위도·경도를 입력하면 자동으로 찾아요'
    : looking || !resolved ? (lookupError ?? '동 이름을 찾는 중…')
      : dong!.name;

  return (
    <div className="stack">
      <div className="row split" style={{ gap: 8, alignItems: 'flex-end' }}>
        <div className="field" style={{ width: 150 }}><label>위도</label>
          <input className="input" inputMode="decimal" placeholder="예) 37.5087" value={lat}
            onChange={(e) => setLat(e.target.value.trim())} /></div>
        <div className="field" style={{ width: 150 }}><label>경도</label>
          <input className="input" inputMode="decimal" placeholder="예) 126.9634" value={lng}
            onChange={(e) => setLng(e.target.value.trim())} /></div>
        <button type="button" className="btn btn-secondary" onClick={useGps}>현재 위치</button>
      </div>
      <div className="field"><label>지역 (시·도 시·군·구 동 · 좌표로 자동 설정 · 수정 불가)</label>
        <input className="input" value={dongText} readOnly tabIndex={-1} aria-readonly
          style={{ background: '#f2f2f2', color: resolved ? '#1a1a1a' : lookupError ? '#c62828' : '#808080', cursor: 'default' }} />
      </div>
      {!valid && (lat !== '' || lng !== '') && (
        <p className="hint" style={{ margin: 0, color: '#c62828' }}>위도는 -90~90, 경도는 -180~180 사이 숫자로 입력해 주세요.</p>
      )}
      <p className="hint" style={{ margin: 0 }}>
        다른 사람에게는 동 이름과 거리(500m·1km)만 보여요. 공구 목록은 이 좌표에서 반경 안에 있는 글을 보여줘요.
      </p>
      <button type="button" className="btn btn-primary" disabled={busy || !resolved} onClick={submit}>{submitLabel}</button>
    </div>
  );
}
