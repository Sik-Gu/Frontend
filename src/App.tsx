import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import LocationPicker from './components/LocationPicker';
import AdminPage from './pages/AdminPage';
import ChargeResultPage from './pages/ChargeResultPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import LoginPage, { SignupPage } from './pages/LoginPage';
import MyPage from './pages/MyPage';
import PointPage from './pages/PointPage';
import PostCreatePage from './pages/PostCreatePage';
import PasswordResetPage from './pages/PasswordResetPage';
import PostDetailPage from './pages/PostDetailPage';
import PostEditPage from './pages/PostEditPage';
import ReportPage from './pages/ReportPage';
import { SessionProvider, ToastProvider, useSession } from './lib/session';

/** 로그인 + 동네 설정이 끝나야 들어갈 수 있는 화면 */
function Protected({ children }: { children: ReactNode }) {
  const { me, loading } = useSession();
  if (loading) return <div className="page muted">불러오는 중…</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role === 'ADMIN') return <Navigate to="/admin" replace />; // 관리자 계정은 관리자 페이지만 쓴다
  if (!me.location) return <Navigate to="/setup-location" replace />;
  return <>{children}</>;
}

/** 관리자 전용 화면: ADMIN 계정만 (동네 설정 필요 없음) */
function AdminOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useSession();
  if (loading) return <div className="page muted">불러오는 중…</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SetupLocationPage() {
  const { me, loading } = useSession();
  const navigate = useNavigate();
  if (loading) return null;
  if (!me) return <Navigate to="/login" replace />;
  return (
    <div className="page narrow">
      <div className="card stack">
        <h1 style={{ fontSize: 24, margin: 0 }}>우리 동네 설정</h1>
        <p className="muted" style={{ margin: 0 }}>근처 공구를 보여줄 기준 위치예요. 설정해야 공구를 보고 열 수 있어요.</p>
        <LocationPicker submitLabel="동네 설정하고 시작하기" onDone={() => navigate('/')} />
      </div>
    </div>
  );
}

/** / 주소: 로그인 안 했으면 랜딩, 했으면 홈 */
function HomeOrLanding() {
  const { me, loading } = useSession();
  if (loading) return null;
  if (!me) return <LandingPage />;
  return <Protected><HomePage /></Protected>;
}

/** 로그인·회원가입 화면: 이미 로그인했으면 홈으로 */
function GuestOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useSession();
  if (loading) return null;
  return me ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <Header />
          <Routes>
            <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
            <Route path="/password/reset" element={<GuestOnly><PasswordResetPage /></GuestOnly>} />
            <Route path="/setup-location" element={<SetupLocationPage />} />
            <Route path="/admin" element={<AdminOnly><AdminPage /></AdminOnly>} />
            <Route path="/" element={<HomeOrLanding />} />
            <Route path="/posts/new" element={<Protected><PostCreatePage /></Protected>} />
            <Route path="/posts/:postId" element={<Protected><PostDetailPage /></Protected>} />
            <Route path="/posts/:postId/edit" element={<Protected><PostEditPage /></Protected>} />
            <Route path="/report" element={<Protected><ReportPage /></Protected>} />
            <Route path="/chats" element={<Protected><ChatPage /></Protected>} />
            <Route path="/chats/:roomId" element={<Protected><ChatPage /></Protected>} />
            <Route path="/points" element={<Protected><PointPage /></Protected>} />
            {/* 토스 결제창이 끝나면 돌아오는 주소 (lib/toss.ts 의 successUrl · failUrl) */}
            <Route path="/points/charge/success" element={<Protected><ChargeResultPage result="success" /></Protected>} />
            <Route path="/points/charge/fail" element={<Protected><ChargeResultPage result="fail" /></Protected>} />
            <Route path="/me" element={<Protected><MyPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* Vercel Web Analytics: 배포된 사이트의 방문자·페이지 조회 수집 (로컬 dev에서는 수집 안 됨) */}
          <Analytics />
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
