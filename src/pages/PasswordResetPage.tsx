import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useToast } from '../lib/session';

// 백엔드 AuthPatterns.PASSWORD 와 같은 규칙
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/;

type Step = 1 | 2 | 3;

/** 01-B 비밀번호 찾기: 가입한 학교 이메일 → 인증코드 → 새 비밀번호 */
export default function PasswordResetPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  };

  const send = () => run(async () => {
    const res = await authApi.sendResetCode(email.trim());
    setExpiresAt(Date.now() + res.expiresInSec * 1000);
    setCode('');
    setStep(2);
    toast.ok(`${res.email}로 인증코드 발송`);
  });

  const verify = () => run(async () => {
    const res = await authApi.verifyResetCode(email.trim(), code.trim());
    setResetToken(res.verificationToken);
    setStep(3);
  });

  const reset = () => run(async () => {
    await authApi.resetPassword(resetToken, password);
    toast.ok('비밀번호 변경 완료 · 새 비밀번호로 로그인');
    navigate('/login', { replace: true });
  });

  const left = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;
  const pwOk = PASSWORD_RULE.test(password);
  const same = password === password2;

  return (
    <div className="page auth-page">
      <div className="card stack auth-card" style={{ maxWidth: 460, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>비밀번호 찾기</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>가입한 학교 이메일로 인증 후 새 비밀번호 설정</p>
        </div>
        <div className="row small" style={{ gap: 8 }}>
          {['이메일 인증', '코드 확인', '새 비밀번호'].map((label, i) => (
            <span key={label} className={`chip${step === i + 1 ? ' active' : ''}`}>{i + 1}. {label}</span>
          ))}
        </div>

        {step === 1 && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div className="field"><label htmlFor="reset-email">학교 이메일</label>
              <input id="reset-email" className="input" type="email" placeholder="example@univ.ac.kr" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></div>
            <button className="btn btn-primary btn-block" disabled={busy || !email.trim()}>{busy ? '보내는 중…' : '인증코드 받기'}</button>
          </form>
        )}

        {step === 2 && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <div className="notice small">{email}로 보낸 6자리 코드 입력 (정크메일함도 확인)</div>
            <div className="field"><label htmlFor="reset-code">인증코드 {left > 0 ? `(${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')})` : '(만료됨)'}</label>
              <input id="reset-code" className="input" inputMode="numeric" maxLength={6} placeholder="123456" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required /></div>
            <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6 || left === 0}>확인</button>
            <button type="button" className="btn btn-ghost btn-block small" disabled={busy} onClick={send}>코드 다시 받기</button>
          </form>
        )}

        {step === 3 && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); reset(); }}>
            <div className="field"><label htmlFor="reset-pw">새 비밀번호</label>
              <input id="reset-pw" className="input" type="password" value={password} autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)} required />
              <span className={`small ${password && !pwOk ? 'error-text' : 'muted'}`}>영문, 숫자, 특수문자를 포함한 8~20자</span></div>
            <div className="field"><label htmlFor="reset-pw2">새 비밀번호 확인</label>
              <input id="reset-pw2" className="input" type="password" value={password2} autoComplete="new-password"
                onChange={(e) => setPassword2(e.target.value)} required />
              {password2 && !same && <span className="small error-text">비밀번호가 서로 달라요</span>}</div>
            <button className="btn btn-primary btn-block" disabled={busy || !pwOk || !same}>{busy ? '바꾸는 중…' : '비밀번호 바꾸기'}</button>
            <p className="small muted" style={{ margin: 0 }}>변경 시 다른 기기의 로그인은 해제됨</p>
          </form>
        )}

        <div className="small muted" style={{ textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text-strong)', fontWeight: 700, textDecoration: 'underline' }}>로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
