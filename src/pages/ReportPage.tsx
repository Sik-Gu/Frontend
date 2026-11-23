import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { chatApi, reportApi, userApi } from '../api/endpoints';
import type { ChatMessage, ProfileResponse, ReportReason, ViolationStage } from '../api/types';
import { Icon, ImageBox, ImageUploader } from '../components/ui';
import { clock } from '../lib/format';
import { useToast } from '../lib/session';

/** 신고 화면으로 올 때 함께 넘기는 관련 공구 정보 (프로필 모달 → 신고하기) */
export interface ReportPostState { postId: number; title: string; thumbnailUrl: string | null; chatRoomId: number | null; }

const REASONS: { value: ReportReason; label: string; desc: string }[] = [
  { value: 'CHAT_ABUSE', label: '채팅 비속어 등', desc: '욕설·비속어, 비하·혐오 표현, 성희롱, 위협적인 메시지' },
  { value: 'TRADE_VIOLATION', label: '거래 중 규칙 위반', desc: '노쇼·약속 불이행, 결제 미이행, 물품 불일치·누락, 임의 가격 변경' },
  { value: 'ETC', label: '기타', desc: '위 항목에 해당하지 않는 문제' },
];

const STAGES: { value: ViolationStage; label: string }[] = [
  { value: 'RECRUITING', label: '모집' },
  { value: 'PAYMENT', label: '결제' },
  { value: 'ORDER', label: '주문' },
  { value: 'SHIPPING', label: '배송' },
  { value: 'DISTRIBUTION', label: '나눔' },
  { value: 'RECEIPT', label: '수령' },
];

const MIN_CONTENT = 10;

/** 08-B 신고하기. 대상은 항상 사람 (게시글 신고는 백엔드가 받지 않음) */
export default function ReportPage() {
  const [params] = useSearchParams();
  const targetUserId = Number(params.get('userId'));
  const related = (useLocation().state as { post?: ReportPostState } | null)?.post ?? null;
  const navigate = useNavigate();
  const toast = useToast();

  const [target, setTarget] = useState<ProfileResponse | null>(null);
  const [reason, setReason] = useState<ReportReason>('CHAT_ABUSE');
  const [stage, setStage] = useState<ViolationStage | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    userApi.profile(targetUserId).then(setTarget).catch((e) => toast.error(e));
  }, [targetUserId, toast]);

  // 채팅 비속어 신고: 같은 채팅방에서 상대가 보낸 메시지를 골라야 한다
  const roomId = related?.chatRoomId ?? null;
  useEffect(() => {
    if (reason !== 'CHAT_ABUSE' || messages !== null || !roomId) return;
    (async () => {
      try {
        const all: ChatMessage[] = [];
        let cursor: number | null = null;
        for (let i = 0; i < 5; i++) { // 최근 150개까지
          const page = await chatApi.messages(roomId, cursor);
          all.push(...page.messages);
          if (!page.hasNext) break;
          cursor = page.nextCursor;
        }
        setMessages(all.filter((m) => m.senderId === targetUserId && m.type !== 'SYSTEM')
          .sort((a, b) => b.messageId - a.messageId));
      } catch (e) {
        setMessageError(e instanceof Error ? e.message : String(e));
        setMessages([]);
      }
    })();
  }, [reason, roomId, messages, targetUserId]);

  if (!targetUserId) {
    return <div className="page"><div className="card">신고할 사용자를 찾을 수 없어요. <Link to="/">홈으로</Link></div></div>;
  }

  const contentOk = reason === 'ETC' ? content.trim().length >= MIN_CONTENT : content.trim().length === 0 || content.trim().length >= MIN_CONTENT;
  const ready = contentOk
    && (reason !== 'CHAT_ABUSE' || picked.length > 0)
    && (reason !== 'TRADE_VIOLATION' || stage !== null);

  const submit = async () => {
    setBusy(true);
    try {
      await reportApi.create({
        targetUserId,
        reason,
        detail: reason === 'CHAT_ABUSE' ? { messageIds: picked }
          : reason === 'TRADE_VIOLATION' && stage ? { violationStage: stage } : undefined,
        content: content.trim() || undefined,
        imageUrls: images,
      });
      toast.ok('신고를 접수했어요. 운영팀이 검토할게요.');
      navigate(related ? `/posts/${related.postId}` : '/', { replace: true });
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <div className="card stack" style={{ maxWidth: 560, margin: '0 auto', padding: 28 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, margin: 0 }}>신고하기</h1>
            <div className="small muted">{target ? `${target.nickname}님을 신고해요` : '불러오는 중…'}</div>
          </div>
          <button className="btn btn-ghost" aria-label="닫기" onClick={() => navigate(-1)}><Icon name="close" size={20} /></button>
        </div>

        {related && (
          <div className="row" style={{ background: 'var(--surface-muted)', borderRadius: 8, padding: 10, gap: 10 }}>
            <ImageBox src={related.thumbnailUrl} label="" style={{ width: 36, height: 36, borderRadius: 6, fontSize: 0 }} />
            <div className="grow">
              <div className="small muted">관련 공구</div>
              <div className="strong">{related.title}</div>
            </div>
          </div>
        )}

        <div className="strong">신고 사유 (필수)</div>
        <div className="stack sm">
          {REASONS.map((r) => (
            <label key={r.value} className={`radio-card${reason === r.value ? ' on' : ''}`}>
              <input type="radio" name="reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
              <div className="stack sm grow" style={{ gap: 2 }}>
                <span className="strong">{r.label}</span>
                <span className="small muted">{r.desc}</span>

                {r.value === 'CHAT_ABUSE' && reason === 'CHAT_ABUSE' && (
                  <div className="stack sm" style={{ marginTop: 8 }}>
                    <span className="small strong">문제가 된 메시지를 골라 주세요 (1개 이상)</span>
                    {!roomId ? (
                      <div className="notice small">관련 공구의 채팅방이 없어요. 공구 상세나 채팅방에서 상대 프로필을 눌러 신고해 주세요.</div>
                    ) : messages === null ? <span className="small muted">메시지를 불러오는 중…</span>
                      : messageError ? <div className="notice danger small">{messageError}</div>
                        : messages.length === 0 ? <span className="small muted">이 채팅방에 상대가 보낸 메시지가 없어요.</span> : (
                          <div className="stack sm" style={{ maxHeight: 220, overflowY: 'auto', background: '#fff', border: '1px solid var(--surface-muted)', borderRadius: 8, padding: 8 }}>
                            {messages.map((m) => (
                              <label key={m.messageId} className="row small" style={{ gap: 8, cursor: 'pointer', alignItems: 'flex-start' }}>
                                <input type="checkbox" checked={picked.includes(m.messageId)} onChange={(e) => setPicked(e.target.checked
                                  ? [...picked, m.messageId] : picked.filter((x) => x !== m.messageId))} />
                                <span className="grow">{m.type === 'IMAGE' ? '[사진]' : m.content}</span>
                                <span className="muted">{clock(m.sentAt)}</span>
                              </label>
                            ))}
                          </div>
                        )}
                  </div>
                )}

                {r.value === 'TRADE_VIOLATION' && reason === 'TRADE_VIOLATION' && (
                  <div className="stack sm" style={{ marginTop: 8 }}>
                    <span className="small strong">어느 단계에서 생겼나요? (필수)</span>
                    <div className="row wrap" style={{ gap: 6 }}>
                      {STAGES.map((s) => (
                        <button key={s.value} type="button" className={`chip${stage === s.value ? ' active' : ''}`}
                          onClick={(e) => { e.preventDefault(); setStage(s.value); }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="field">
          <label className="strong">상세 내용{reason === 'ETC' ? ' (필수)' : ' (선택)'}</label>
          <textarea className="textarea" rows={5} maxLength={1000} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={`어떤 문제가 있었는지 자세히 적어 주세요 (최소 ${MIN_CONTENT}자)`} style={{ resize: 'vertical' }} />
          <div className="row between small muted">
            <span>{!contentOk ? `${MIN_CONTENT}자 이상 적어 주세요` : ''}</span>
            <span>{content.length} / 1000</span>
          </div>
        </div>

        <div className="stack sm">
          <span className="strong">증빙 자료 (선택)</span>
          <ImageUploader type="REPORT" urls={images} onChange={setImages} max={5} label="+ 스크린샷" />
        </div>

        <p className="small muted" style={{ margin: 0 }}>
          신고 내용은 운영팀이 검토하며, 신고자 정보는 상대에게 공개되지 않아요. 허위 신고 시 이용이 제한될 수 있어요.
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-secondary grow" onClick={() => navigate(-1)}>취소</button>
          <button className="btn btn-primary grow" disabled={busy || !ready} onClick={submit}>신고 제출</button>
        </div>
      </div>
    </div>
  );
}
