import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import type { DailyStat, NameCount, StatsSummary } from '../api/types';
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL, fullDateTime, pt } from '../lib/format';
import { useToast } from '../lib/session';

const num = (n: number) => n.toLocaleString('ko-KR');

type Metric = 'newUsers' | 'newPosts' | 'newParticipations' | 'settledPosts' | 'cancelledPosts' | 'chargeAmount';
const METRICS: { key: Metric; label: string; unit: (n: number) => string }[] = [
  { key: 'newUsers', label: '신규 가입', unit: (n) => `${num(n)}명` },
  { key: 'newPosts', label: '새 공구', unit: (n) => `${num(n)}개` },
  { key: 'newParticipations', label: '참여 신청', unit: (n) => `${num(n)}건` },
  { key: 'settledPosts', label: '정산 완료', unit: (n) => `${num(n)}개` },
  { key: 'cancelledPosts', label: '취소', unit: (n) => `${num(n)}개` },
  { key: 'chargeAmount', label: '충전액', unit: (n) => pt(n) },
];
const RANGES = [7, 30, 90];
const STATUS_ORDER = ['RECRUITING', 'RECRUITED', 'ORDERED', 'SHIPPING', 'DISTRIBUTED', 'SETTLED', 'CANCELLED'] as const;

/** 관리자 첫 화면: 이용자·공구·포인트·신고 통계 */
export default function AdminDashboardPage() {
  const toast = useToast();
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [days, setDays] = useState(30);
  const [daily, setDaily] = useState<DailyStat[] | null>(null);
  const [metric, setMetric] = useState<Metric>('newUsers');

  useEffect(() => { adminApi.statsSummary().then(setSummary).catch((e) => toast.error(e)); }, [toast]);
  useEffect(() => {
    setDaily(null);
    adminApi.statsDaily(days).then(setDaily).catch((e) => toast.error(e));
  }, [days, toast]);

  if (!summary) return <div className="page muted">불러오는 중…</div>;
  const { users, posts, points, reports } = summary;
  const rate = posts.recruitSuccessRate;

  return (
    <div className="page stack lg">
      <div className="row between wrap">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>관리자 · 대시보드</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>관리자 계정을 뺀 일반 이용자 기준이에요.</p>
        </div>
        <span className="small muted">{fullDateTime(summary.generatedAt)} 기준</span>
      </div>

      <div className="admin-kpis">
        <Kpi label="전체 이용자" value={`${num(users.total)}명`} sub={`오늘 +${num(users.newToday)} · 이번 주 +${num(users.newThisWeek)}`} to="/admin/users" />
        <Kpi label="전체 공구" value={`${num(posts.total)}개`} sub={`오늘 +${num(posts.newToday)} · 모집 중 ${num(posts.byStatus.RECRUITING)}`} />
        <Kpi label="모집 성공률" value={rate === null ? '-' : `${Math.round(rate * 100)}%`}
          sub={posts.avgParticipants === null ? '정산된 공구 없음' : `정산 공구 평균 ${posts.avgParticipants.toFixed(1)}명 참여`} />
        <Kpi label="처리 전 신고" value={`${num(reports.pending)}건`} sub={`누적 ${num(reports.total)}건 · 정지 계정 ${num(users.suspended)}명`}
          to="/admin/reports" alert={reports.pending > 0} />
        <Kpi label="처리 전 수령 문의" value={`${num(reports.openInquiries)}건`} sub="문의가 걸린 공구는 정산이 멈춰 있어요"
          to="/admin/inquiries" alert={reports.openInquiries > 0} />
      </div>

      <section className="card stack">
        <div className="row between wrap">
          <h2 className="card-title" style={{ margin: 0 }}>날짜별 추이</h2>
          <div className="row wrap" style={{ gap: 6 }}>
            {RANGES.map((d) => (
              <button key={d} className={`chip${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>최근 {d}일</button>
            ))}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {METRICS.map((m) => (
            <button key={m.key} className={`chip${metric === m.key ? ' active' : ''}`} onClick={() => setMetric(m.key)}>{m.label}</button>
          ))}
        </div>
        {daily ? <DailyChart data={daily} metric={METRICS.find((m) => m.key === metric)!} />
          : <div className="muted" style={{ height: 220 }}>불러오는 중…</div>}
      </section>

      <div className="admin-grid">
        <section className="card stack">
          <h2 className="card-title" style={{ margin: 0 }}>공구 상태</h2>
          <HBars rows={STATUS_ORDER.map((s) => ({ name: STATUS_LABEL[s], count: posts.byStatus[s] }))} unit="개" />
        </section>
        <section className="card stack">
          <h2 className="card-title" style={{ margin: 0 }}>카테고리</h2>
          <HBars rows={CATEGORIES.map((c) => ({ name: CATEGORY_LABEL[c], count: posts.byCategory[c] }))} unit="개" />
        </section>
        <section className="card stack">
          <h2 className="card-title" style={{ margin: 0 }}>가입자 많은 학교</h2>
          {summary.topUniversities.length ? <HBars rows={summary.topUniversities} unit="명" /> : <p className="muted">아직 없어요.</p>}
        </section>
        <section className="card stack">
          <h2 className="card-title" style={{ margin: 0 }}>가입자 많은 동네</h2>
          {summary.topDongs.length ? <HBars rows={summary.topDongs} unit="명" /> : <p className="muted">아직 없어요.</p>}
        </section>
      </div>

      <section className="card stack">
        <h2 className="card-title" style={{ margin: 0 }}>포인트</h2>
        <div className="admin-points">
          <PointCell label="오늘 충전" value={points.chargedToday} />
          <PointCell label="누적 충전" value={points.chargedTotal} />
          <PointCell label="누적 결제(보류로 빠짐)" value={points.paidTotal} />
          <PointCell label="누적 환급" value={points.refundedTotal} />
          <PointCell label="누적 정산 지급" value={points.settledTotal} />
          <PointCell label="지금 보류 중" value={points.heldNow} />
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, to, alert }: { label: string; value: string; sub: string; to?: string; alert?: boolean }) {
  const body = (
    <>
      <span className="small muted">{label}</span>
      <span className="admin-kpi-value tabular" style={alert ? { color: 'var(--accent-text)' } : undefined}>{value}</span>
      <span className="small muted">{sub}</span>
    </>
  );
  return to ? <Link to={to} className="card admin-kpi admin-kpi-link">{body}</Link> : <div className="card admin-kpi">{body}</div>;
}

function PointCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="stack sm" style={{ gap: 4 }}>
      <span className="small muted">{label}</span>
      <span className="strong tabular" style={{ fontSize: 18 }}>{pt(value)}</span>
    </div>
  );
}

/** 가로 막대: 한 가지 값의 크기 비교 (막대 옆에 값을 바로 적는다) */
function HBars({ rows, unit }: { rows: NameCount[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="stack sm">
      {rows.map((r) => (
        <div key={r.name} className="admin-hbar" title={`${r.name} ${num(r.count)}${unit}`}>
          <span className="small admin-hbar-name">{r.name}</span>
          <span className="admin-hbar-track">
            <span className="admin-hbar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="small strong tabular admin-hbar-value">{num(r.count)}</span>
        </div>
      ))}
    </div>
  );
}

const CHART_H = 200;
const AXIS_W = 44;

/** 날짜별 세로 막대 (한 지표만). 막대에 마우스를 올리면 그날 값을 보여 준다 */
function DailyChart({ data, metric }: { data: DailyStat[]; metric: (typeof METRICS)[number] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const values = data.map((d) => d[metric.key]);
  const max = Math.max(...values);
  const niceMax = useMemo(() => niceCeil(max), [max]);
  const total = values.reduce((a, b) => a + b, 0);
  const width = 720;
  const plotW = width - AXIS_W;
  const slot = plotW / data.length;
  const barW = Math.max(2, Math.min(28, slot - 2));
  // 개수·금액은 정수라 가운데 눈금이 소수가 되면 뺀다
  const ticks = Number.isInteger(niceMax / 2) ? [0, niceMax / 2, niceMax] : [0, niceMax];
  const labelEvery = Math.ceil(data.length / 8);
  const h = hover === null ? null : data[hover];

  return (
    <div className="stack sm">
      <div className="row between wrap">
        <span className="small muted">기간 합계 <span className="strong tabular" style={{ color: 'var(--text-strong)' }}>{metric.unit(total)}</span></span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)}>{showTable ? '그래프로 보기' : '표로 보기'}</button>
      </div>
      {showTable ? (
        <div className="table-wrap" style={{ maxHeight: 320 }}>
          <table className="table">
            <thead><tr><th>날짜</th><th className="num">{metric.label}</th></tr></thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}><td>{d.date}</td><td className="num tabular">{metric.unit(d[metric.key])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-chart">
        <div className="admin-chart-inner" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${width} ${CHART_H + 28}`} width="100%" role="img"
            aria-label={`최근 ${data.length}일 ${metric.label}, 합계 ${metric.unit(total)}`}>
            {ticks.map((t) => {
              const y = CHART_H - (t / niceMax) * CHART_H;
              return (
                <g key={t}>
                  <line x1={AXIS_W} x2={width} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
                  <text x={AXIS_W - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">{compact(t)}</text>
                </g>
              );
            })}
            {data.map((d, i) => {
              const v = values[i];
              const bh = niceMax === 0 ? 0 : (v / niceMax) * CHART_H;
              const x = AXIS_W + i * slot + (slot - barW) / 2;
              const r = Math.min(4, barW / 2, bh);
              return (
                <g key={d.date}>
                  {bh > 0 && <path d={topRounded(x, CHART_H - bh, barW, bh, r)}
                    fill={hover === null || hover === i ? 'var(--accent)' : 'var(--accent-soft)'} />}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={CHART_H + 18} textAnchor="middle" fontSize={11} fill="var(--text-muted)">{d.date.slice(5).replace('-', '.')}</text>
                  )}
                  {/* 막대보다 넓은 마우스 영역 */}
                  <rect x={AXIS_W + i * slot} y={0} width={slot} height={CHART_H} fill="transparent"
                    onMouseEnter={() => setHover(i)} />
                </g>
              );
            })}
            <line x1={AXIS_W} x2={width} y1={CHART_H} y2={CHART_H} stroke="var(--line-strong)" strokeWidth={1} />
          </svg>
          {h && hover !== null && (
            <div className="admin-tooltip" style={{ left: `${((AXIS_W + (hover + 0.5) * slot) / width) * 100}%` }}>
              <div className="small muted">{h.date}</div>
              <div className="strong tabular">{metric.unit(h[metric.key])}</div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

/** 위쪽 두 모서리만 둥근 막대 (바닥은 기준선에 붙음) */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/** 축 최댓값을 보기 좋은 수로 올린다 (0 이면 1) */
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  const f = n / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * p;
}

function compact(n: number): string {
  if (n >= 10000) return `${(n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}
