import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComplianceProgram, CScores, CControl } from '../lib/api';

/**
 * Shared compliance posture dashboard. Used in the client portal (read + edit
 * own program) and in the admin console (manage any client). The `save` prop
 * abstracts which endpoint is called, so this component is boundary-agnostic.
 */

const MATURITY_ORDER = ['not_implemented', 'partial', 'implemented', 'optimized', 'not_applicable'];

function pctColor(pct: number) {
  if (pct >= 75) return 'text-teal';
  if (pct >= 45) return 'text-termamber';
  return 'text-termred';
}
function barColor(pct: number) {
  if (pct >= 75) return 'bg-teal';
  if (pct >= 45) return 'bg-termamber';
  return 'bg-termred';
}

function Ring({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r, filled = (pct / 100) * c;
  return (
    <svg viewBox="0 0 130 130" className="w-[120px] h-[120px]">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#182129" strokeWidth="11" />
      <circle cx="65" cy="65" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
        stroke={pct >= 75 ? '#2FE6C4' : pct >= 45 ? '#E8B54B' : '#FF5D5D'}
        strokeDasharray={`${filled} ${c - filled}`} transform="rotate(-90 65 65)"
        className="score-ring-anim" />
      <text x="65" y="72" textAnchor="middle" className="fill-paper font-display" fontSize="26" fontWeight="700">{pct}%</text>
    </svg>
  );
}

export default function ComplianceDashboard({
  load, save, editable = true,
}: {
  load: () => Promise<ComplianceProgram>;
  save: (controlId: string, d: { maturity: string; evidence: string; owner: string }) => Promise<{ ok: boolean; scores: CScores }>;
  editable?: boolean;
}) {
  const { t } = useTranslation();
  const [prog, setProg] = useState<ComplianceProgram | null>(null);
  const [scores, setScores] = useState<CScores | null>(null);
  const [openControl, setOpenControl] = useState<string | null>(null);
  const [themeFilter, setThemeFilter] = useState<string>('all');

  useEffect(() => { load().then((p) => { setProg(p); setScores(p.scores); }).catch(() => setProg(null)); }, [load]);

  const controlsByTheme = useMemo(() => {
    if (!prog) return {};
    const g: Record<string, CControl[]> = {};
    for (const c of prog.controls) { (g[c.theme] ||= []).push(c); }
    return g;
  }, [prog]);

  if (!prog) return <p className="font-mono text-paper-dim text-[.9rem]">{t('compliance.loading')}</p>;
  const s = scores || prog.scores;

  async function update(controlId: string, d: { maturity: string; evidence: string; owner: string }) {
    const r = await save(controlId, d);
    setScores(r.scores);
    setProg((p) => (p ? { ...p, statuses: { ...p.statuses, [controlId]: { control_id: controlId, updated_at: new Date().toISOString(), ...d } } } : p));
  }

  const themes = themeFilter === 'all' ? prog.themes : [themeFilter];

  return (
    <div className="grid gap-7">
      {/* Overall + frameworks */}
      <div className="neu neu-raised rounded-panel p-8 flex flex-col lg:flex-row gap-8 items-center">
        <div className="text-center shrink-0">
          <Ring pct={s.overall} />
          <div className="font-mono text-[.72rem] text-slate uppercase tracking-[.08em] mt-2">{t('compliance.overall')}</div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 w-full">
          {Object.values(prog.frameworks).map((fw) => {
            const b = s.byFramework[fw.id];
            return (
              <div key={fw.id} className="neu neu-inset rounded-panel p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-semibold text-paper text-[.98rem]">{fw.short}</span>
                  {!fw.verified && <span className="font-mono text-[.6rem] text-termamber border border-termamber/40 rounded px-1.5 py-[1px]">{t('compliance.unverified')}</span>}
                </div>
                <div className={`font-display font-bold text-[1.9rem] leading-none ${pctColor(b.pct)}`}>{b.pct}%</div>
                <div className="font-mono text-[.68rem] text-paper-dim mt-1">{b.applicable} {t('compliance.controlsApplicable')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regional caveat */}
      {!prog.frameworks.cobac.verified && (
        <div className="neu neu-inset rounded-panel p-5 border-l-2 border-termamber/60">
          <p className="font-mono text-[.78rem] text-paper-dim leading-relaxed">{t('compliance.regionalNote')}</p>
        </div>
      )}

      {/* Theme filter */}
      <div className="flex gap-2 flex-wrap font-mono text-[.75rem]">
        <button onClick={() => setThemeFilter('all')} className={`px-3 py-1.5 rounded-brand ${themeFilter === 'all' ? 'bg-cyan text-ink' : 'neu-inset text-paper-dim hover:text-cyan'}`}>{t('compliance.allThemes')}</button>
        {prog.themes.map((th) => (
          <button key={th} onClick={() => setThemeFilter(th)} className={`px-3 py-1.5 rounded-brand ${themeFilter === th ? 'bg-cyan text-ink' : 'neu-inset text-paper-dim hover:text-cyan'}`}>
            {t(`compliance.themes.${th}`)} <span className={pctColor(s.byTheme[th].pct)}>{s.byTheme[th].pct}%</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      {themes.map((th) => (
        <div key={th}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[.8rem] text-cyan tracking-[.08em]">&gt; {t(`compliance.themes.${th}`)}</h3>
            <div className="flex items-center gap-2 w-[180px]">
              <div className="flex-1 h-[6px] bg-ink-3 rounded-full overflow-hidden">
                <div className={`h-full ${barColor(s.byTheme[th].pct)}`} style={{ width: `${Math.max(s.byTheme[th].pct, 3)}%` }} />
              </div>
              <span className={`font-mono text-[.72rem] ${pctColor(s.byTheme[th].pct)}`}>{s.byTheme[th].pct}%</span>
            </div>
          </div>
          <div className="grid gap-2.5">
            {(controlsByTheme[th] || []).map((c) => {
              const st = prog.statuses[c.id];
              const mat = st?.maturity || 'not_implemented';
              return (
                <div key={c.id} className="neu p-5">
                  <button className="w-full text-left flex flex-wrap items-center gap-x-4 gap-y-1.5" onClick={() => setOpenControl(openControl === c.id ? null : c.id)}>
                    <MaturityDot maturity={mat} />
                    <span className="text-paper text-[.95rem] font-medium">{c.title}</span>
                    {c.unverified && <span className="font-mono text-[.6rem] text-termamber border border-termamber/40 rounded px-1.5 py-[1px]">{t('compliance.unverified')}</span>}
                    <span className="ml-auto font-mono text-[.7rem] text-paper-dim">{t(`compliance.maturityShort.${mat}`)}</span>
                  </button>
                  {openControl === c.id && (
                    <ControlEditor control={c} status={st} frameworks={prog.frameworks} editable={editable} onSave={(d) => update(c.id, d)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MaturityDot({ maturity }: { maturity: string }) {
  const map: Record<string, string> = {
    not_implemented: 'bg-termred', partial: 'bg-termamber', implemented: 'bg-teal', optimized: 'bg-cyan', not_applicable: 'bg-slate',
  };
  return <span className={`inline-block w-[10px] h-[10px] rounded-full ${map[maturity] || 'bg-slate'}`} aria-hidden="true" />;
}

function ControlEditor({
  control, status, frameworks, editable, onSave,
}: {
  control: CControl; status?: { maturity: string; evidence: string; owner: string };
  frameworks: Record<string, { short: string }>; editable: boolean;
  onSave: (d: { maturity: string; evidence: string; owner: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [maturity, setMaturity] = useState(status?.maturity || 'not_implemented');
  const [evidence, setEvidence] = useState(status?.evidence || '');
  const [owner, setOwner] = useState(status?.owner || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setBusy(true); setSaved(false);
    await onSave({ maturity, evidence, owner });
    setBusy(false); setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }
  const field = 'w-full bg-ink border border-soft rounded-brand text-paper font-body text-[.9rem] px-[13px] py-[10px] focus:border-cyan focus:outline-none';

  return (
    <div className="mt-4 pt-4 border-t border-soft grid gap-4">
      <p className="text-paper-dim text-[.9rem] leading-relaxed">{control.desc}</p>
      <div className="flex flex-wrap gap-2 font-mono text-[.7rem]">
        {Object.entries(control.mappings).filter(([, v]) => v).map(([fw, ref]) => (
          <span key={fw} className="text-paper-dim border border-soft rounded px-2 py-[3px]">{frameworks[fw]?.short}: {ref}</span>
        ))}
      </div>
      {editable ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="font-mono text-[.7rem] text-slate uppercase tracking-[.08em]">{t('compliance.maturity')}</span>
              <select className={field} value={maturity} onChange={(e) => setMaturity(e.target.value)}>
                {MATURITY_ORDER.map((m) => <option key={m} value={m}>{t(`compliance.maturityLabels.${m}`)}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="font-mono text-[.7rem] text-slate uppercase tracking-[.08em]">{t('compliance.owner')}</span>
              <input className={field} value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={160} placeholder={t('compliance.ownerPh')} />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="font-mono text-[.7rem] text-slate uppercase tracking-[.08em]">{t('compliance.evidence')}</span>
            <textarea className={`${field} min-h-[90px]`} value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={8000} placeholder={t('compliance.evidencePh')} />
          </label>
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={busy} className="btn btn-primary !py-[10px] disabled:opacity-50">{busy ? t('compliance.saving') : t('compliance.save')}</button>
            {saved && <span className="font-mono text-[.78rem] text-teal">{t('compliance.saved')}</span>}
          </div>
        </>
      ) : (
        <div className="grid gap-2 font-mono text-[.82rem]">
          <div><span className="text-slate">{t('compliance.maturity')}: </span><span className="text-paper">{t(`compliance.maturityLabels.${maturity}`)}</span></div>
          {owner && <div><span className="text-slate">{t('compliance.owner')}: </span><span className="text-paper">{owner}</span></div>}
          {evidence && <div className="text-paper-dim whitespace-pre-wrap">{evidence}</div>}
        </div>
      )}
    </div>
  );
}
