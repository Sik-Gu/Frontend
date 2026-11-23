import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import LocationPicker from '../components/LocationPicker';
import { useSession, useToast } from '../lib/session';

// 백엔드 AuthPatterns.PASSWORD 와 같은 규칙
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/;

/** 01 로그인 */
export default function LoginPage() {
  return (
    <div className="page auth-page">
      <LoginCard />
    </div>
  );
}

/** 01 회원가입 */
export function SignupPage() {
  return (
    <div className="page auth-page">
      <SignupCard />
    </div>
  );
}

function LoginCard() {
  const { login } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      toast.ok(`${me?.nickname ?? ''}님, 반가워요`);
      navigate(me?.location ? '/' : '/setup-location');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack auth-card" style={{ maxWidth: 460, gap: 20 }} onSubmit={submit}>
      <div>
        <h1 style={{ fontSize: 26, margin: 0 }}>로그인</h1>
        <p className="muted" style={{ margin: '8px 0 0' }}>학교 이메일로 인증된 이웃과 공동구매해요</p>
      </div>
      <div className="field"><label htmlFor="login-email">학교 이메일</label>
        <input id="login-email" className="input" type="email" placeholder="example@univ.ac.kr" value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></div>
      <div className="field"><label htmlFor="login-pw">비밀번호</label>
        <input id="login-pw" className="input" type="password" placeholder="••••••••" value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? '로그인 중…' : '로그인'}</button>
      <div className="small muted" style={{ textAlign: 'center' }}>
        아직 회원이 아니신가요?{' '}
        <Link to="/signup" style={{ color: 'var(--text-strong)', fontWeight: 700, textDecoration: 'underline' }}>회원가입하기</Link>
      </div>
      <div className="small muted" style={{ textAlign: 'center' }} title="MVP 범위 밖이에요">비밀번호 찾기 (준비 중)</div>
    </form>
  );
}

type Step = 1 | 2 | 3;

function SignupCard() {
  const { login } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const left = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  };

  const send = () => run(async () => {
    const res = await authApi.sendEmail(email.trim());
    setSentTo(res.email);
    setExpiresAt(Date.now() + res.expiresInSec * 1000);
    setToken(null);
    setCode('');
    toast.ok(`${res.email}로 인증코드를 보냈어요. 메일함(정크 메일함 포함)을 확인해 주세요.`);
  });

  const verify = () => run(async () => {
    const res = await authApi.verifyEmail(sentTo ?? email.trim(), code.trim());
    setToken(res.verificationToken);
    setStep(2);
    toast.ok('이메일 인증이 끝났어요. 비밀번호를 정해 주세요.');
  });

  const pwError = password && !PASSWORD_RULE.test(password)
    ? '영문, 숫자, 특수문자를 포함한 8~20자로 입력해 주세요.'
    : password2 && password !== password2 ? '비밀번호가 서로 달라요.' : null;

  const signup = () => run(async () => {
    if (!token) return;
    const res = await authApi.signup(token, password);
    await login(sentTo ?? email.trim(), password);
    toast.ok(`가입했어요! 닉네임은 '${res.nickname}'이에요.`);
    setStep(3);
  });

  const chip = (n: Step, label: string) => (
    <span className={`chip${step === n ? ' active' : ''}`} style={{ cursor: 'default' }}>{n}  {label}</span>
  );

  return (
    <div className="card stack auth-card" style={{ maxWidth: 560, gap: 20 }}>
      <h1 style={{ fontSize: 26, margin: 0 }}>회원가입</h1>
      <div className="row" style={{ gap: 10 }}>
        {chip(1, '이메일 인증')}<span className="muted">—</span>{chip(2, '정보 입력')}<span className="muted">—</span>{chip(3, '동네 설정')}
      </div>

      {step === 3 ? (
        <>
          <p style={{ margin: 0 }}>마지막으로 우리 동네를 정해 주세요. 근처 공구를 보여줄 때 기준이 돼요.</p>
          <LocationPicker submitLabel="동네 설정하고 시작하기" onDone={() => navigate('/')} />
        </>
      ) : (
        <>
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="field grow"><label htmlFor="su-email">학교 이메일</label>
              <input id="su-email" className="input" type="email" placeholder="example@univ.ac.kr" value={email}
                disabled={step !== 1} onChange={(e) => setEmail(e.target.value)} /></div>
            <button type="button" className="btn btn-secondary" disabled={busy || step !== 1 || !email.trim()} onClick={send}>
              {sentTo ? '다시 보내기' : '인증메일 발송'}
            </button>
          </div>
          {sentTo && step === 1 && (
            <p className="hint" style={{ margin: '-8px 0 0' }}>
              {left > 0 ? `코드 유효 시간 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '코드가 만료됐어요. 다시 보내 주세요.'}
            </p>
          )}

          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="field grow"><label htmlFor="su-code">인증 코드</label>
              <input id="su-code" className="input" inputMode="numeric" maxLength={6} placeholder="메일로 받은 6자리 코드"
                value={code} disabled={!sentTo || step !== 1} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>
            <button type="button" className="btn btn-secondary" disabled={busy || step !== 1 || code.length !== 6} onClick={verify}>
              {token ? '인증 완료 ✓' : '확인'}
            </button>
          </div>

          <div className="row split" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="field grow"><label htmlFor="su-pw">비밀번호</label>
              <input id="su-pw" className="input" type="password" placeholder="영문·숫자·특수문자 8~20자" value={password}
                disabled={step !== 2} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
            <div className="field grow"><label htmlFor="su-pw2">비밀번호 확인</label>
              <input id="su-pw2" className="input" type="password" placeholder="한 번 더 입력" value={password2}
                disabled={step !== 2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" /></div>
          </div>
          {pwError && <p className="error-text" style={{ margin: '-8px 0 0' }}>{pwError}</p>}

          <div className="notice">닉네임은 가입할 때 랜덤으로 만들어져요 · 예) 배고픈 고구마</div>
          <button type="button" className="btn btn-primary btn-block"
            disabled={busy || step !== 2 || !password || !!pwError || password !== password2} onClick={signup}>
            가입하기
          </button>
          <div className="small muted" style={{ textAlign: 'center' }}>
            이미 계정이 있나요?{' '}
            <Link to="/login" style={{ color: 'var(--text-strong)', fontWeight: 700, textDecoration: 'underline' }}>로그인하기</Link>
          </div>
        </>
      )}
    </div>
  );
}
