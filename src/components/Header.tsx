import { useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { pt } from '../lib/format';
import { useSession } from '../lib/session';
import NotificationBell from './NotificationBell';
import { Avatar } from './ui';

export default function Header() {
  const { me } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">Sik-Gu</Link>
        {me && (
          <nav className="nav">
            <NavLink to="/" end>홈</NavLink>
            <NavLink to="/chats">채팅</NavLink>
            <NavLink to="/points">포인트</NavLink>
            <NavLink to="/me">마이페이지</NavLink>
          </nav>
        )}
        {me && (
          <div className="header-right">
            <form onSubmit={(e) => {
              e.preventDefault();
              navigate(keyword.trim() ? `/?keyword=${encodeURIComponent(keyword.trim())}` : '/');
            }}>
              <input className="search" placeholder="공구 검색 (단어 또는 초성)" value={keyword}
                onChange={(e) => setKeyword(e.target.value)} aria-label="공구 검색" />
            </form>
            <Link to="/points" className="point-chip tabular" title="사용 가능 포인트">{pt(me.point.availableBalance)}</Link>
            <Link to="/posts/new" className="btn btn-primary btn-sm">+ 공구 열기</Link>
            <NotificationBell />
            <Link to="/me" title={me.nickname}><Avatar name={me.nickname} /></Link>
          </div>
        )}
      </div>
    </header>
  );
}
