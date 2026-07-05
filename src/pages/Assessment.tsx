import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSeo } from '../lib/seo';
import { assessmentApi, AssessmentResult, ApiError } from '../lib/api';
import PageHeader from '../components/pages/PageHeader';

/**
 * Interactive Security Posture Assessment.
 * 15 questions / 5 domains, answered 0-1-2. Scoring is recomputed server-side;
 * the response drives the animated report. Completed assessments are stored
 * as leads and (when SMTP is configured) emailed to the firm.
 */

const DOMAINS = ['gov', 'iam', 'infra', 'people', 'resilience'] as const;
const QUESTIONS: Record<string, string[]> = {
  gov: ['gov1', 'gov2', 'gov3'],
  iam: ['iam1', 'iam2', 'iam3'],
  infra: ['infra1', 'infra2', 'infra3'],
  people: ['people1', 'people2', 'people3'],
  resilience: ['res1', 'res2', 'res3'],
};
const ALL_IDS = DOMAINS.flatMap((d) => QUESTIONS[d]);

// Weak domain -> the Skelion service that fixes it.
const DOMAIN_SERVICE: Record<string, { to: string }> = {
  gov: { to: '/grc' },
  iam: { to: '/pentesting' },
  infra: { to: '/pentesting' },
  people: { to: '/training' },
  resilience: { to: '/ciso' },
};

type Phase = 'intro' | 'quiz' | 'identity' | 'sending' | 'result' | 'error';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-teal', B: 'text-teal', C: 'text-termamber', D: 'text-termamber', E: 'text-termred',
};

function ScoreRing({ pct, grade }: { pct: number; grade: string }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const filled = (pct / 100) * c;
  return (
    <svg viewBox="0 0 160 160" className="w-[160px] h-[160px]" role="img" aria-label={`${pct}%`}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="#182129" strokeWidth="12" />
      <circle
        cx="80" cy="80" r={r} fill="none"
        stroke={pct >= 70 ? '#2FE6C4' : pct >= 40 ? '#E8B54B' : '#FF5D5D'}
        strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 80 80)"
        className="score-ring-anim"
      />
      <text x="80" y="74" textAnchor="middle" className="fill-paper font-display" fontSize="34" fontWeight="700">{pct}%</text>
      <text x="80" y="102" textAnchor="middle" className={GRADE_COLOR[grade] === 'text-teal' ? 'fill-teal' : GRADE_COLOR[grade] === 'text-termred' ? 'fill-termred' : 'fill-termamber'} fontSize="16" fontFamily="IBM Plex Mono">{grade}</text>
    </svg>
  );
}

export default function Assessment() {
  const { t, i18n } = useTranslation();
  useSeo({ title: t('assessment.seoTitle'), description: t('assessment.seoDesc'), path: '/assessment' });

  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 0 | 1 | 2>>({});
  const [identity, setIdentity] = useState({ name: '', organization: '', email: '' });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const qid = ALL_IDS[qIndex];
  const domainOf = (id: string) => DOMAINS.find((d) => QUESTIONS[d].includes(id))!;
  const progress = Math.round((qIndex / ALL_IDS.length) * 100);

  const weakDomains = useMemo(() => {
    if (!result) return [];
    return DOMAINS.filter((d) => result.domain_scores[d].pct < 67);
  }, [result]);

  function answer(v: 0 | 1 | 2) {
    const next = { ...answers, [qid]: v };
    setAnswers(next);
    if (qIndex + 1 < ALL_IDS.length) setQIndex(qIndex + 1);
    else setPhase('identity');
  }

  async function submit() {
    setPhase('sending');
    try {
      const r = await assessmentApi.submit({
        answers: answers as Record<string, 0 | 1 | 2>,
        ...identity,
        locale: i18n.resolvedLanguage === 'fr' ? 'fr' : 'en',
        website: '',
      });
      setResult(r);
      setPhase('result');
    } catch (e) {
      setErrMsg(e instanceof ApiError && e.status === 429 ? t('assessment.rateLimited') : t('assessment.failed'));
      setPhase('error');
    }
  }

  const field =
    'w-full bg-ink border border-soft rounded-brand text-paper font-body text-[.94rem] px-[15px] py-[13px] transition-colors focus:border-cyan focus:outline-none';

  return (
    <>
      <PageHeader cmd={t('assessment.cmd')} sub={t('assessment.sub')}>
        {t('assessment.titleA')}<span className="text-cyan">{t('assessment.titleB')}</span>
      </PageHeader>

      <section className="max-w-[860px] mx-auto px-7 pb-24">
        {phase === 'intro' && (
          <div className="neu neu-raised rounded-panel p-9">
            <p className="text-paper-dim leading-relaxed mb-4">{t('assessment.introP1')}</p>
            <p className="text-paper-dim leading-relaxed mb-7">{t('assessment.introP2')}</p>
            <ul className="grid gap-2.5 mb-8 font-mono text-[.85rem] text-paper-dim">
              {DOMAINS.map((d) => (
                <li key={d} className="flex items-center gap-2.5">
                  <span className="text-cyan" aria-hidden="true">›</span> {t(`assessment.domains.${d}`)}
                </li>
              ))}
            </ul>
            <button className="btn btn-primary" onClick={() => setPhase('quiz')}>{t('assessment.start')}</button>
          </div>
        )}

        {phase === 'quiz' && (
          <div className="neu neu-raised rounded-panel p-9">
            <div className="flex items-center justify-between mb-2 font-mono text-[.75rem] text-paper-dim">
              <span>{t(`assessment.domains.${domainOf(qid)}`)}</span>
              <span>{qIndex + 1} / {ALL_IDS.length}</span>
            </div>
            <div className="h-[6px] rounded-full bg-ink-3 overflow-hidden mb-7" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-cyan transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <h2 className="font-display text-[1.35rem] text-paper font-semibold mb-6">{t(`assessment.q.${qid}.text`)}</h2>
            <div className="grid gap-3">
              {[2, 1, 0].map((v) => (
                <button
                  key={v}
                  className="neu neu-hover text-left rounded-brand px-5 py-4 text-paper-dim hover:text-paper border border-transparent hover:border-cyan/40 transition-colors text-[.95rem]"
                  onClick={() => answer(v as 0 | 1 | 2)}
                >
                  {t(`assessment.q.${qid}.a${v}`)}
                </button>
              ))}
            </div>
            {qIndex > 0 && (
              <button className="mt-6 font-mono text-[.8rem] text-paper-dim hover:text-cyan" onClick={() => setQIndex(qIndex - 1)}>
                ‹ {t('assessment.back')}
              </button>
            )}
          </div>
        )}

        {(phase === 'identity' || phase === 'sending') && (
          <div className="neu neu-raised rounded-panel p-9">
            <h2 className="font-display text-[1.35rem] text-paper font-semibold mb-2">{t('assessment.idTitle')}</h2>
            <p className="text-paper-dim text-[.92rem] mb-6">{t('assessment.idSub')}</p>
            <div className="grid gap-4 mb-7">
              <input className={field} placeholder={t('assessment.idName')} value={identity.name}
                onChange={(e) => setIdentity({ ...identity, name: e.target.value })} maxLength={120} />
              <input className={field} placeholder={t('assessment.idOrg')} value={identity.organization}
                onChange={(e) => setIdentity({ ...identity, organization: e.target.value })} maxLength={160} />
              <input className={field} type="email" placeholder={t('assessment.idMail')} value={identity.email}
                onChange={(e) => setIdentity({ ...identity, email: e.target.value })} maxLength={254} />
            </div>
            <button className="btn btn-primary disabled:opacity-50" disabled={phase === 'sending'} onClick={submit}>
              {phase === 'sending' ? t('assessment.computing') : t('assessment.getResults')}
            </button>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="grid gap-6">
            <div className="neu neu-raised rounded-panel p-9 flex flex-col sm:flex-row items-center gap-8">
              <ScoreRing pct={result.pct} grade={result.grade} />
              <div>
                <div className="font-mono text-[.75rem] text-paper-dim mb-1">{t('assessment.refLabel')} {result.reference}</div>
                <h2 className={`font-display text-[1.6rem] font-bold mb-2 ${GRADE_COLOR[result.grade]}`}>
                  {t(`assessment.grades.${result.grade}`)}
                </h2>
                <p className="text-paper-dim text-[.95rem] leading-relaxed">{t(`assessment.gradeDesc.${result.grade}`)}</p>
              </div>
            </div>

            <div className="neu neu-raised rounded-panel p-9">
              <h3 className="font-mono text-[.8rem] text-cyan tracking-[.08em] mb-5">&gt; {t('assessment.byDomain')}</h3>
              <div className="grid gap-4">
                {DOMAINS.map((d) => {
                  const ds = result.domain_scores[d];
                  return (
                    <div key={d}>
                      <div className="flex justify-between font-mono text-[.8rem] mb-1.5">
                        <span className="text-paper">{t(`assessment.domains.${d}`)}</span>
                        <span className={ds.pct >= 67 ? 'text-teal' : ds.pct >= 34 ? 'text-termamber' : 'text-termred'}>{ds.points}/{ds.max}</span>
                      </div>
                      <div className="h-[8px] rounded-full bg-ink-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${ds.pct >= 67 ? 'bg-teal' : ds.pct >= 34 ? 'bg-termamber' : 'bg-termred'}`}
                          style={{ width: `${Math.max(ds.pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {weakDomains.length > 0 && (
              <div className="neu neu-raised rounded-panel p-9">
                <h3 className="font-mono text-[.8rem] text-cyan tracking-[.08em] mb-5">&gt; {t('assessment.recsTitle')}</h3>
                <div className="grid gap-4">
                  {weakDomains.map((d) => (
                    <div key={d} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-soft pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="text-paper font-medium mb-1">{t(`assessment.domains.${d}`)}</div>
                        <div className="text-paper-dim text-[.88rem]">{t(`assessment.recs.${d}`)}</div>
                      </div>
                      <Link to={DOMAIN_SERVICE[d].to} className="btn btn-ghost shrink-0">{t('assessment.recCta')}</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="neu neu-inset rounded-panel p-9 text-center">
              <p className="text-paper-dim mb-5">{t('assessment.closing')}</p>
              <Link to="/contact" className="btn btn-primary">{t('assessment.contactCta')}</Link>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="neu neu-raised rounded-panel p-9">
            <p className="font-mono text-termred mb-5" role="alert">{errMsg}</p>
            <button className="btn btn-primary" onClick={submit}>{t('assessment.retry')}</button>
          </div>
        )}
      </section>
    </>
  );
}
