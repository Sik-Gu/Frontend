import { useState } from 'react';
import { userApi } from '../api/endpoints';
import { DONG_PRESETS } from '../lib/dongs';
import { useSession, useToast } from '../lib/session';

/** 집 위치(동 이름 + 좌표) 설정 — 가입 3단계, 홈 '변경', 마이페이지에서 쓴다 */
export default function LocationPicker({ onDone, submitLabel = '이 동네로 설정' }: {
  onDone?: () => void; submitLabel?: string;
}) {
  const { me, refresh } = useSession();
  const toast = useToast();
  const current = me?.location;
  const [name, setName] = useState(current?.dongName ?? DONG_PRESETS[0].name);
  const [lat, setLat] = useState(String(current?.latitude ?? DONG_PRESETS[0].latitude));
  const [lng, setLng] = useState(String(current?.longitude ?? DONG_PRESETS[0].longitude));
  const [busy, setBusy] = useState(false);

  const useGps = () => {
    if (!navigator.geolocation) { toast.error(new Error('이 브라우저는 위치 기능을 지원하지 않아요')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); toast.ok('현재 위치 좌표를 넣었어요. 동 이름은 직접 입력해 주세요.'); },
      () => toast.error(new Error('위치 권한이 없어 현재 위치를 가져오지 못했어요')),
    );
  };

  const submit = async () => {
    setBusy(true);
    try {
      await userApi.setLocation(name.trim(), Number(lat), Number(lng));
      await refresh();
      toast.ok(`동네를 ${name.trim()}(으)로 설정했어요`);
      onDone?.();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="row wrap" style={{ gap: 8 }}>
        {DONG_PRESETS.map((d) => (
          <button key={d.name} type="button" className={`chip${name === d.name && Number(lat) === d.latitude ? ' active' : ''}`}
            onClick={() => { setName(d.name); setLat(String(d.latitude)); setLng(String(d.longitude)); }}>
            📍 {d.label}
          </button>
        ))}
      </div>
      <div className="row split" style={{ gap: 8, alignItems: 'flex-end' }}>
        <div className="field grow"><label>동 이름</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 흑석동" /></div>
        <div className="field" style={{ width: 130 }}><label>위도</label>
          <input className="input" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div className="field" style={{ width: 130 }}><label>경도</label>
          <input className="input" value={lng} onChange={(e) => setLng(e.target.value)} /></div>
        <button type="button" className="btn btn-secondary" onClick={useGps}>현재 위치</button>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        다른 사람에게는 동 이름과 거리(500m·1km)만 보여요. 테스트할 때는 두 계정을 같은 동으로 맞추면 서로의 공구가 보여요.
      </p>
      <button type="button" className="btn btn-primary" disabled={busy || !name.trim()} onClick={submit}>{submitLabel}</button>
    </div>
  );
}
