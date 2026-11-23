import { Link } from 'react-router-dom';

/** 00 랜딩: 로그인 안 한 사람이 / 로 들어오면 보이는 첫 화면 */
export default function LandingPage() {
  return (
    <div className="landing">
      {/* 오른쪽에 크게 걸쳐서 천천히 도는 로고 마크 (장식이라 스크린리더에서는 숨김) */}
      <img className="landing-mark" src="/logo-mark.svg" alt="" aria-hidden="true" />

      <header className="landing-header">
        <img className="landing-wordmark" src="/logo-wordmark.svg" alt="Sik-Gu" />
      </header>

      <main className="landing-hero">
        <h1 className="landing-title">
          혼자 먹기엔 많아서,<br />
          <span className="landing-accent">같이</span> 사요.
        </h1>
        {/* 시작하기를 누르면 먼저 로그인 화면으로 (회원가입은 로그인 화면에서 이동) */}
        <Link to="/login" className="landing-start">시작하기</Link>
      </main>
    </div>
  );
}
