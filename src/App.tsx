import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import LocationPicker from './components/LocationPicker';
import ChargeResultPage from './pages/ChargeResultPage';
import ChatPage from './pages/ChatPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MyPage from './pages/MyPage';
import PointPage from './pages/PointPage';
import PostCreatePage from './pages/PostCreatePage';
import PostDetailPage from './pages/PostDetailPage';
import { SessionProvider, ToastProvider, useSession } from './lib/session';

/** 로그인 + 동네 설정이 끝나야 들어갈 수 있는 화면 */
function Protected({ children }: { children: ReactNode }) {
  const { me, loading } = useSession();
  if (loading) return <div className="page muted">불러오는 중…</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (!me.location) return <Navigate to="/setup-location" replace />;
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

function LoginRoute() {
  const { me, loading } = useSession();
  if (loading) return null;
  return me ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <Header />
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/setup-location" element={<SetupLocationPage />} />
            <Route path="/" element={<Protected><HomePage /></Protected>} />
            <Route path="/posts/new" element={<Protected><PostCreatePage /></Protected>} />
            <Route path="/posts/:postId" element={<Protected><PostDetailPage /></Protected>} />
            <Route path="/chats" element={<Protected><ChatPage /></Protected>} />
            <Route path="/chats/:roomId" element={<Protected><ChatPage /></Protected>} />
            <Route path="/points" element={<Protected><PointPage /></Protected>} />
            {/* 토스 결제창이 끝나면 돌아오는 주소 (lib/toss.ts 의 successUrl · failUrl) */}
            <Route path="/points/charge/success" element={<Protected><ChargeResultPage result="success" /></Protected>} />
            <Route path="/points/charge/fail" element={<Protected><ChargeResultPage result="fail" /></Protected>} />
            <Route path="/me" element={<Protected><MyPage /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
