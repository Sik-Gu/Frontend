import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postApi } from '../api/endpoints';
import type { Category, PostDetail } from '../api/types';
import { ImageUploader } from '../components/ui';
import { CATEGORIES, CATEGORY_LABEL, won } from '../lib/format';
import { useSession, useToast } from '../lib/session';

/** 수정할 수 있는 공구인지: 호스트 본인 + 모집중 + 다른 참여자 없음 (백엔드 POST4091 규칙과 같다) */
export function canEditPost(post: PostDetail, myUserId: number | undefined): boolean {
  return post.host.userId === myUserId && post.status === 'RECRUITING' && post.participantCount <= 1;
}

/** 04 공구 수정. 가격·단위는 바꿀 수 없다 (이미 내 몫이 결제됐기 때문, D8) */
export default function PostEditPage() {
  const postId = Number(useParams().postId);
  const { me } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<Category>('FOOD');
  const [title, setTitle] = useState('');
  const [productLink, setProductLink] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    postApi.detail(postId).then((d) => {
      setPost(d);
      setImageUrls(d.imageUrls);
      setProductName(d.productName);
      setCategory(d.category);
      setTitle(d.title);
      setProductLink(d.productLink ?? '');
      setContent(d.content ?? '');
    }).catch((e) => toast.error(e));
  }, [postId, toast]);

  if (!post) return <div className="page muted">불러오는 중…</div>;
  if (!canEditPost(post, me?.userId)) {
    return (
      <div className="page narrow">
        <div className="card stack">
          <div>모집중이고 다른 참여자가 없을 때 호스트만 수정할 수 있어요.</div>
          <Link to={`/posts/${postId}`} className="btn btn-secondary">공구로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const ready = title.trim() && productName.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      await postApi.update(postId, {
        title: title.trim(), productName: productName.trim(), productLink: productLink.trim(),
        category, content: content.trim(), imageUrls,
      });
      toast.ok('공구 내용 수정 완료');
      navigate(`/posts/${postId}`, { replace: true });
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow" style={{ maxWidth: 760 }}>
      <form className="card stack lg" style={{ padding: 40 }} onSubmit={submit}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>공구 수정</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>다른 사람이 참여하기 전까지만 수정 가능 · 가격·단위는 변경 불가</p>
        </div>

        <div className="field"><label>상품 사진 (최대 10장)</label>
          <ImageUploader type="POST" urls={imageUrls} onChange={setImageUrls} max={10} /></div>

        <div className="row split" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="field grow"><label>상품명</label>
            <input className="input" value={productName} maxLength={100} onChange={(e) => setProductName(e.target.value)} /></div>
          <div className="field grow"><label>카테고리</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select></div>
        </div>

        <div className="field"><label>게시글 제목</label>
          <input className="input" value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} /></div>

        <div className="input small muted">
          판매 단위 (수정 불가) · 1단위({post.baseUnit}) {won(post.unitPrice)} · 총 {post.totalUnits}단위 {won(post.totalPrice)}
        </div>

        <div className="field"><label>상품 링크 (선택)</label>
          <input className="input" placeholder="https://" value={productLink} maxLength={500} onChange={(e) => setProductLink(e.target.value)} /></div>
        <div className="field"><label>내용</label>
          <textarea className="textarea" value={content} maxLength={2000} onChange={(e) => setContent(e.target.value)} /></div>

        <hr className="divider" />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>취소</button>
          <button className="btn btn-primary" disabled={!ready || busy}>{busy ? '저장 중…' : '수정 완료'}</button>
        </div>
      </form>
    </div>
  );
}
