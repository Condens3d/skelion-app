import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminPortal, adminComplianceApi, AdminClient, AdminClientUser, AdminEngagementRow, Finding, EngagementInput, FindingInput, ApiError,
} from '../../lib/api';
import ComplianceDashboard from '../ComplianceDashboard';

/** Admin-side provisioning for the client portal: organizations, their users,
 *  engagements, and findings. Drill-down: org -> (users, engagements) -> findings. */

const field = 'bg-ink border border-soft rounded-brand text-paper font-body text-[.88rem] px-[13px] py-[10px] focus:border-cyan focus:outline-none';
const lbl = 'font-mono text-[.7rem] text-slate uppercase tracking-[.08em]';
const ENG_TYPES = ['pentest', 'grc', 'vciso', 'training', 'physical', 'other'] as const;
const ENG_STATUSES = ['scoping', 'active', 'reporting', 'remediation', 'closed'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const F_STATUSES = ['open', 'in_remediation', 'resolved', 'accepted_risk', 'closed'] as const;

export default function ClientsManager() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => adminPortal.clients().then((r) => setClients(r.items)).catch(() => setClients([])), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    try { await adminPortal.createClient(name); (e.target as HTMLFormElement).reset(); load(); }
    catch (ex) { setErr(ex instanceof ApiError && ex.status === 409 ? t('admin.clients.nameExists') : t('admin.saveError')); }
  }
  async function remove(id: number) {
    if (!confirm(t('admin.clients.delClientConfirm'))) return;
    await adminPortal.deleteClient(id).catch(() => {});
    if (sel === id) setSel(null);
    load();
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={create} className="neu p-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 grow max-w-[340px]">
          <span className={lbl}>{t('admin.clients.newOrg')}</span>
          <input name="name" className={field} placeholder={t('admin.clients.orgPh')} maxLength={160} />
        </label>
        <button className="btn btn-primary !py-[10px]">{t('admin.clients.addOrg')}</button>
        {err && <span className="font-mono text-[.78rem] text-termred w-full" role="alert">{err}</span>}
      </form>

      <div className="grid gap-3">
        {clients.length === 0 && <p className="font-mono text-[.85rem] text-paper-dim">{t('admin.clients.none')}</p>}
        {clients.map((c) => (
          <div key={c.id} className="neu p-5">
            <button className="w-full text-left flex flex-wrap items-center gap-x-5 gap-y-1" onClick={() => setSel(sel === c.id ? null : c.id)}>
              <span className="text-paper font-display font-semibold text-[1.05rem]">{c.name}</span>
              <span className="font-mono text-[.72rem] text-paper-dim">{c.users} {t('admin.clients.usersN')} · {c.engagements} {t('admin.clients.engsN')}</span>
              <span className="ml-auto font-mono text-[.7rem] text-paper-dim">{new Date(c.created_at).toLocaleDateString()}</span>
            </button>
            {sel === c.id && (
              <div className="mt-5 pt-5 border-t border-soft grid gap-7">
                <UsersPanel clientId={c.id} />
                <EngagementsPanel clientId={c.id} onChanged={load} />
                <CompliancePanel clientId={c.id} />
                <button onClick={() => remove(c.id)} className="w-fit font-mono text-[.75rem] text-termred hover:underline">{t('admin.clients.delClient')}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersPanel({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminClientUser[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => adminPortal.users(clientId).then((r) => setUsers(r.items)).catch(() => setUsers([])), [clientId]);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg('');
    const fd = new FormData(e.currentTarget);
    const payload = { client_id: clientId, email: String(fd.get('email') || ''), name: String(fd.get('name') || ''), password: String(fd.get('password') || '') };
    try {
      await adminPortal.createUser(payload);
      setMsg(t('admin.clients.userCreated'));
      (e.target as HTMLFormElement).reset(); load();
    } catch (ex) {
      setMsg(ex instanceof ApiError && ex.status === 409 ? t('admin.clients.emailExists') : t('admin.clients.pwPolicy'));
    }
  }
  async function reset(id: number) {
    const pw = prompt(t('admin.clients.resetPrompt'));
    if (!pw) return;
    try { await adminPortal.resetPassword(id, pw); setMsg(t('admin.clients.pwReset')); }
    catch { setMsg(t('admin.clients.pwPolicy')); }
  }
  async function remove(id: number) {
    if (!confirm(t('admin.delConfirm'))) return;
    await adminPortal.deleteUser(id).catch(() => {});
    load();
  }

  return (
    <div>
      <h4 className="font-mono text-[.78rem] text-cyan tracking-[.08em] mb-3">&gt; {t('admin.clients.users')}</h4>
      <form onSubmit={create} className="flex flex-wrap items-end gap-3 mb-4">
        <label className="grid gap-1.5"><span className={lbl}>{t('admin.email')}</span><input name="email" type="email" required className={field} /></label>
        <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.userName')}</span><input name="name" className={field} /></label>
        <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.tempPw')}</span><input name="password" required minLength={12} className={field} /></label>
        <button className="btn btn-ghost neu-btn !py-[10px] !px-[18px] !text-[.8rem]">{t('admin.clients.addUser')}</button>
      </form>
      {msg && <p className="font-mono text-[.75rem] text-teal mb-3" role="status">{msg}</p>}
      <div className="grid gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[.78rem] border-b border-soft pb-2 last:border-0">
            <span className="text-paper">{u.email}</span>
            <span className="text-paper-dim">{u.name || '·'}</span>
            <span className="text-paper-dim ml-auto">{u.last_login ? `${t('admin.clients.lastLogin')} ${new Date(u.last_login).toLocaleString()}` : t('admin.clients.neverLogged')}</span>
            <button onClick={() => reset(u.id)} className="text-cyan hover:underline">{t('admin.clients.resetPw')}</button>
            <button onClick={() => remove(u.id)} className="text-termred hover:underline">{t('admin.del')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_ENG: Omit<EngagementInput, 'client_id'> = { title: '', type: 'pentest', status: 'scoping', summary: '', start_date: '', end_date: '' };

function EngagementsPanel({ clientId, onChanged }: { clientId: number; onChanged: () => void }) {
  const { t } = useTranslation();
  const [engs, setEngs] = useState<AdminEngagementRow[]>([]);
  const [editing, setEditing] = useState<AdminEngagementRow | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_ENG);
  const [openFindings, setOpenFindings] = useState<number | null>(null);
  const load = useCallback(() => adminPortal.engagements(clientId).then((r) => setEngs(r.items)).catch(() => setEngs([])), [clientId]);
  useEffect(() => { load(); }, [load]);

  function startEdit(e: AdminEngagementRow | 'new') {
    setEditing(e);
    setForm(e === 'new' ? EMPTY_ENG : { title: e.title, type: e.type, status: e.status, summary: e.summary, start_date: e.start_date, end_date: e.end_date });
  }
  async function save() {
    const payload: EngagementInput = { client_id: clientId, ...form };
    if (editing === 'new') await adminPortal.createEngagement(payload).catch(() => {});
    else if (editing) await adminPortal.updateEngagement(editing.id, payload).catch(() => {});
    setEditing(null); load(); onChanged();
  }
  async function remove(id: number) {
    if (!confirm(t('admin.clients.delEngConfirm'))) return;
    await adminPortal.deleteEngagement(id).catch(() => {});
    load(); onChanged();
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <h4 className="font-mono text-[.78rem] text-cyan tracking-[.08em]">&gt; {t('admin.clients.engagements')}</h4>
        <button onClick={() => startEdit('new')} className="font-mono text-[.75rem] text-teal hover:underline">+ {t('admin.clients.addEng')}</button>
      </div>

      {editing && (
        <div className="neu neu-inset p-5 grid gap-3 mb-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5 sm:col-span-2"><span className={lbl}>{t('admin.clients.engTitle')}</span>
              <input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} /></label>
            <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.engType')}</span>
              <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ENG_TYPES.map((x) => <option key={x} value={x}>{t(`portal.types.${x}`)}</option>)}
              </select></label>
            <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.engStatus')}</span>
              <select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {ENG_STATUSES.map((x) => <option key={x} value={x}>{t(`portal.statuses.${x}`)}</option>)}
              </select></label>
            <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.engStart')}</span>
              <input type="date" className={field} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
            <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.engEnd')}</span>
              <input type="date" className={field} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
          </div>
          <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.engSummary')}</span>
            <textarea className={`${field} min-h-[110px]`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
          <div className="flex gap-3">
            <button onClick={save} className="btn btn-primary !py-[10px]">{t('admin.save')}</button>
            <button onClick={() => setEditing(null)} className="btn btn-ghost neu-btn !py-[10px] !px-[18px] !text-[.8rem]">{t('admin.cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {engs.map((e) => (
          <div key={e.id} className="border-b border-soft pb-3 last:border-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[.78rem]">
              <span className="text-cyan">SKL-E-{String(e.id).padStart(4, '0')}</span>
              <span className="text-paper font-body text-[.9rem]">{e.title}</span>
              <span className="text-paper-dim uppercase">{t(`portal.statuses.${e.status}`)}</span>
              <span className="ml-auto flex gap-3">
                <button onClick={() => setOpenFindings(openFindings === e.id ? null : e.id)} className="text-teal hover:underline">{t('admin.clients.findings')}</button>
                <button onClick={() => startEdit(e)} className="text-cyan hover:underline">{t('admin.edit')}</button>
                <button onClick={() => remove(e.id)} className="text-termred hover:underline">{t('admin.del')}</button>
              </span>
            </div>
            {openFindings === e.id && <FindingsPanel engagementId={e.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_F: Omit<FindingInput, 'engagement_id'> = { title: '', severity: 'medium', cvss: null, status: 'open', description: '', impact: '', remediation: '' };

function FindingsPanel({ engagementId }: { engagementId: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Finding[]>([]);
  const [editing, setEditing] = useState<Finding | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_F);
  const load = useCallback(() => adminPortal.findings(engagementId).then((r) => setItems(r.items)).catch(() => setItems([])), [engagementId]);
  useEffect(() => { load(); }, [load]);

  function startEdit(f: Finding | 'new') {
    setEditing(f);
    setForm(f === 'new' ? EMPTY_F : { title: f.title, severity: f.severity, cvss: f.cvss, status: f.status, description: f.description, impact: f.impact, remediation: f.remediation });
  }
  async function save() {
    const payload: FindingInput = { engagement_id: engagementId, ...form, cvss: form.cvss === null || Number.isNaN(form.cvss) ? null : Number(form.cvss) };
    if (editing === 'new') await adminPortal.createFinding(payload).catch(() => {});
    else if (editing) await adminPortal.updateFinding(editing.id, payload).catch(() => {});
    setEditing(null); load();
  }
  async function remove(id: number) {
    if (!confirm(t('admin.delConfirm'))) return;
    await adminPortal.deleteFinding(id).catch(() => {});
    load();
  }

  return (
    <div className="mt-3 ml-4 pl-4 border-l border-soft">
      <button onClick={() => startEdit('new')} className="font-mono text-[.75rem] text-teal hover:underline mb-3">+ {t('admin.clients.addFinding')}</button>
      {editing && (
        <div className="neu neu-inset p-5 grid gap-3 mb-4">
          <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.fTitle')}</span>
            <input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={240} /></label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.fSeverity')}</span>
              <select className={field} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {SEVERITIES.map((x) => <option key={x} value={x}>{t(`portal.sev.${x}`)}</option>)}
              </select></label>
            <label className="grid gap-1.5"><span className={lbl}>{t('admin.clients.fStatus')}</span>
              <select className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {F_STATUSES.map((x) => <option key={x} value={x}>{t(`portal.fstatus.${x}`)}</option>)}
              </select></label>
            <label className="grid gap-1.5"><span className={lbl}>CVSS</span>
              <input type="number" step="0.1" min="0" max="10" className={field} value={form.cvss ?? ''}
                onChange={(e) => setForm({ ...form, cvss: e.target.value === '' ? null : Number(e.target.value) })} /></label>
          </div>
          {(['description', 'impact', 'remediation'] as const).map((k) => (
            <label key={k} className="grid gap-1.5"><span className={lbl}>{t(`admin.clients.f_${k}`)}</span>
              <textarea className={`${field} min-h-[90px]`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
          ))}
          <div className="flex gap-3">
            <button onClick={save} className="btn btn-primary !py-[10px]">{t('admin.save')}</button>
            <button onClick={() => setEditing(null)} className="btn btn-ghost neu-btn !py-[10px] !px-[18px] !text-[.8rem]">{t('admin.cancel')}</button>
          </div>
        </div>
      )}
      <div className="grid gap-1.5">
        {items.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[.75rem]">
            <span className={
              f.severity === 'critical' || f.severity === 'high' ? 'text-termred' : f.severity === 'medium' ? 'text-termamber' : 'text-teal'
            }>{t(`portal.sev.${f.severity}`)}</span>
            {f.cvss != null && <span className="text-paper-dim">CVSS {Number(f.cvss).toFixed(1)}</span>}
            <span className="text-paper font-body text-[.88rem]">{f.title}</span>
            <span className="text-paper-dim uppercase">{t(`portal.fstatus.${f.status}`)}</span>
            <span className="ml-auto flex gap-3">
              <button onClick={() => startEdit(f)} className="text-cyan hover:underline">{t('admin.edit')}</button>
              <button onClick={() => remove(f.id)} className="text-termred hover:underline">{t('admin.del')}</button>
            </span>
          </div>
        ))}
        {items.length === 0 && <span className="font-mono text-[.75rem] text-paper-dim">{t('admin.clients.noFindings')}</span>}
      </div>
    </div>
  );
}

function CompliancePanel({ clientId }: { clientId: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="font-mono text-[.78rem] text-cyan hover:underline">
        &gt; {t('admin.clients.compliance')} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-4">
          <ComplianceDashboard
            load={() => adminComplianceApi.get(clientId)}
            save={(cid, d) => adminComplianceApi.update(clientId, cid, d)}
            editable
          />
        </div>
      )}
    </div>
  );
}
