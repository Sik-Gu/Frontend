import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { pt } from '../lib/format';
import { useSession } from '../lib/session';
import NotificationBell from './NotificationBell';
import { Avatar, Icon } from './ui';

export default function Header() {
  const { me, logout } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');
  const { pathname } = useLocation();

  // 로그인 전 랜딩(/)은 자체 헤더를 쓰므로 공통 헤더를 숨긴다
  if (!me && pathname === '/') return null;

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo" aria-label="Sik-Gu 홈">
          <img src="/logo-mark.svg" alt="" className="logo-mark" />
          <img src="/logo-wordmark.svg" alt="" className="logo-word" />
        </Link>
        {me?.role === 'ADMIN' && (
          <>
            <nav className="nav">
              <NavLink to="/admin" end>대시보드</NavLink>
              <NavLink to="/admin/posts">공구</NavLink>
              <NavLink to="/admin/users">이용자</NavLink>
              <NavLink to="/admin/inquiries">문의</NavLink>
              <NavLink to="/admin/reports">신고 관리</NavLink>
            </nav>
            <div className="header-right">
              <span className="small muted">관리자 · {me.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={async () => { await logout(); navigate('/login'); }}>로그아웃</button>
            </div>
          </>
        )}
        {me && me.role !== 'ADMIN' && (
          <nav className="nav">
            <NavLink to="/" end>홈</NavLink>
            <NavLink to="/chats">채팅</NavLink>
            <NavLink to="/points">포인트</NavLink>
            <NavLink to="/me">마이페이지</NavLink>
          </nav>
        )}
        {me && me.role !== 'ADMIN' && (
          <div className="header-right">
            <form onSubmit={(e) => {
              e.preventDefault();
              navigate(keyword.trim() ? `/?keyword=${encodeURIComponent(keyword.trim())}` : '/');
            }}>
              <label className="search">
                <Icon name="search" />
                <input placeholder="생수, 휴지, ㄹㅁ(초성)…" value={keyword}
                  onChange={(e) => setKeyword(e.target.value)} aria-label="공구 검색" />
              </label>
            </form>
            <Link to="/points" className="point-chip tabular" title="사용 가능 포인트">{pt(me.point.availableBalance)}</Link>
            <Link to="/posts/new" className="btn btn-primary header-new">
              <Icon name="plus" />공구 열기
            </Link>
            <NotificationBell />
            <Link to="/me" title={me.nickname} className="header-avatar"><Avatar name={me.nickname} /></Link>
          </div>
        )}
      </div>
    </header>
  );
}
