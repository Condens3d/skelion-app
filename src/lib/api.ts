/** Typed client for the Skelion API. Cookies carry the admin session. */

export interface PostListItem {
  id: number;
  slug: string;
  tag: string;
  title_en: string;
  title_fr: string;
  excerpt_en: string;
  excerpt_fr: string;
  published_at: string | null;
}

export interface PostFull extends PostListItem {
  body_en: string;
  body_fr: string;
  published: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface AdminPostRow {
  id: number;
  slug: string;
  tag: string;
  title_en: string;
  title_fr: string;
  published: 0 | 1;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Stats {
  submissions: number;
  submissionsNew: number;
  posts: number;
  postsPublished: number;
  subscribers: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`api_error_${status}`);
    this.status = status;
    this.body = body;
  }
}

// ---- public ----
export const api = {
  listInsights: (limit = 20, offset = 0) =>
    fetch(`/api/v1/insights?limit=${limit}&offset=${offset}`).then(json<{ total: number; items: PostListItem[] }>),
  getInsight: (slug: string) => fetch(`/api/v1/insights/${encodeURIComponent(slug)}`).then(json<PostFull>),
  subscribe: (email: string, locale: string) =>
    fetch('/api/v1/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locale }),
    }),
};

// ---- admin (session cookie) ----
export const adminApi = {
  me: () => fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
  login: (email: string, password: string) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  loginMfa: (pending: string, token: string) =>
    fetch('/api/auth/login/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending, token }),
    }),
  mfaSetup: () => fetch("/api/auth/mfa/setup", { method: "POST" }).then(json<{ secret: string; otpauth: string; qr_svg: string }>),
  mfaEnable: (token: string) =>
    fetch('/api/auth/mfa/enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).then(json<{ ok: boolean; recovery_codes: string[] }>),
  mfaDisable: (token: string) =>
    fetch('/api/auth/mfa/disable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).then(json<{ ok: boolean }>),
  logout: () => fetch('/api/auth/logout', { method: 'POST' }),
  stats: () => fetch('/api/admin/stats').then(json<Stats>),
  submissions: (limit = 200) =>
    fetch(`/api/admin/submissions?limit=${limit}`).then(json<{ total: number; items: Submission[] }>),
  setSubmissionHandled: (id: number, handled: boolean) =>
    fetch(`/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handled }),
    }),
  deleteSubmission: (id: number) => fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' }),
  listPosts: () => fetch('/api/admin/insights').then(json<{ total: number; items: AdminPostRow[] }>),
  getPost: (id: number) => fetch(`/api/admin/insights/${id}`).then(json<PostFull>),
  createPost: (body: PostInput) =>
    fetch('/api/admin/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  updatePost: (id: number, body: PostInput) =>
    fetch(`/api/admin/insights/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deletePost: (id: number) => fetch(`/api/admin/insights/${id}`, { method: 'DELETE' }),
  subscribers: () => fetch('/api/admin/subscribers').then(json<{ total: number; items: Subscriber[] }>),
  deleteSubscriber: (id: number) => fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' }),
};

export interface Submission {
  id: number;
  name: string;
  organization: string;
  email: string;
  service: string;
  message: string;
  locale: string;
  created_at: string;
  handled: 0 | 1;
  handled_at: string | null;
}

export interface Subscriber {
  id: number;
  email: string;
  locale: string;
  created_at: string;
}

export interface PostInput {
  slug: string;
  tag: string;
  title_en: string;
  title_fr: string;
  excerpt_en: string;
  excerpt_fr: string;
  body_en: string;
  body_fr: string;
  published: boolean;
}

// ---- Security posture assessment ----
export interface DomainScore { points: number; max: number; pct: number }
export interface AssessmentResult {
  ok: boolean; reference: string; total_score: number; pct: number; grade: string;
  domain_scores: Record<string, DomainScore>;
}
export interface AdminAssessmentRow {
  id: number; name: string; organization: string; email: string;
  domain_scores: Record<string, DomainScore>; total_score: number; grade: string;
  locale: string; created_at: string;
}
export interface TimelineDay { day: string; submissions: number; assessments: number }

const jsonHeaders = { 'Content-Type': 'application/json' };

export const assessmentApi = {
  submit: (payload: { answers: Record<string, 0 | 1 | 2>; name: string; organization: string; email: string; locale: string; website: string }) =>
    fetch('/api/v1/assessment', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) }).then(json<AssessmentResult>),
};

export const adminExtras = {
  assessments: () => fetch('/api/admin/assessments').then(json<{ total: number; items: AdminAssessmentRow[] }>),
  assessment: (id: number) => fetch(`/api/admin/assessments/${id}`).then(json<AdminAssessmentRow & { answers: Record<string, number> }>),
  deleteAssessment: (id: number) => fetch(`/api/admin/assessments/${id}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  timeline: () => fetch('/api/admin/timeline').then(json<{ days: TimelineDay[] }>),
  testEmail: () => fetch('/api/admin/test-email', { method: 'POST' }).then(json<{ ok: boolean; to?: string; error?: string }>),
};

// ---- client portal ----
export interface PortalEngagement {
  id: number; client_id: number; title: string; type: string; status: string;
  summary: string; start_date: string; end_date: string; created_at: string; updated_at: string;
  findings_total: number; findings_open: number;
  severity_counts: Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>;
}
export interface Finding {
  id: number; engagement_id: number; title: string; severity: string; cvss: number | null;
  status: string; description: string; impact: string; remediation: string;
  created_at: string; updated_at: string; resolved_at: string | null;
}
export interface AdminClient { id: number; name: string; created_at: string; users: number; engagements: number }
export interface AdminClientUser { id: number; client_id: number; email: string; name: string; last_login: string | null; created_at: string }
export interface AdminEngagementRow {
  id: number; client_id: number; title: string; type: string; status: string;
  summary: string; start_date: string; end_date: string; created_at: string; updated_at: string;
}
export interface EngagementInput {
  client_id: number; title: string; type: string; status: string; summary: string; start_date: string; end_date: string;
}
export interface FindingInput {
  engagement_id: number; title: string; severity: string; cvss: number | null; status: string;
  description: string; impact: string; remediation: string;
}

export const portalApi = {
  me: () => fetch('/api/portal/me').then((r) => (r.ok ? (r.json() as Promise<{ email: string; name: string }>) : null)),
  login: (email: string, password: string) =>
    fetch('/api/portal/login', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ email, password }) }).then(json<{ ok: boolean; email: string; name: string }>),
  logout: () => fetch('/api/portal/logout', { method: 'POST' }),
  engagements: () => fetch('/api/portal/engagements').then(json<{ items: PortalEngagement[] }>),
  engagement: (id: number) => fetch(`/api/portal/engagements/${id}`).then(json<AdminEngagementRow & { findings: Finding[] }>),
  changePassword: (current: string, next: string) =>
    fetch('/api/portal/change-password', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ current, next }) }).then(json<{ ok: boolean }>),
};

export const adminPortal = {
  clients: () => fetch('/api/admin/clients').then(json<{ items: AdminClient[] }>),
  createClient: (name: string) => fetch('/api/admin/clients', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name }) }).then(json<{ id: number }>),
  deleteClient: (id: number) => fetch(`/api/admin/clients/${id}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  users: (clientId: number) => fetch(`/api/admin/clients/${clientId}/users`).then(json<{ items: AdminClientUser[] }>),
  createUser: (u: { client_id: number; email: string; name: string; password: string }) =>
    fetch('/api/admin/client-users', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(u) }).then(json<{ id: number }>),
  resetPassword: (id: number, password: string) =>
    fetch(`/api/admin/client-users/${id}/reset-password`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ password }) }).then(json<{ ok: boolean }>),
  deleteUser: (id: number) => fetch(`/api/admin/client-users/${id}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  engagements: (clientId: number) => fetch(`/api/admin/clients/${clientId}/engagements`).then(json<{ items: AdminEngagementRow[] }>),
  createEngagement: (e: EngagementInput) => fetch('/api/admin/engagements', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(e) }).then(json<{ id: number }>),
  updateEngagement: (id: number, e: EngagementInput) => fetch(`/api/admin/engagements/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(e) }).then(json<{ ok: boolean }>),
  deleteEngagement: (id: number) => fetch(`/api/admin/engagements/${id}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  findings: (engId: number) => fetch(`/api/admin/engagements/${engId}/findings`).then(json<{ items: Finding[] }>),
  createFinding: (f: FindingInput) => fetch('/api/admin/findings', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(f) }).then(json<{ id: number }>),
  updateFinding: (id: number, f: FindingInput) => fetch(`/api/admin/findings/${id}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(f) }).then(json<{ ok: boolean }>),
  deleteFinding: (id: number) => fetch(`/api/admin/findings/${id}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
};

// ---- operator diagnostics (OPS_KEY gated) ----
export interface Diagnostics {
  time: string; env: string;
  database: { driver: string; connected: boolean; error?: string };
  data?: { submissions: number | null; clients: number | null };
  mail: { ok: boolean; error?: string; host?: string; port?: number; secure?: boolean; to?: string; from?: string };
}
export const opsApi = {
  diagnostics: (key: string) => fetch('/api/ops/diagnostics', { headers: { 'x-ops-key': key } }).then(json<Diagnostics>),
  testEmail: (key: string) => fetch('/api/ops/test-email', { method: 'POST', headers: { 'x-ops-key': key } }).then(json<{ ok: boolean; to?: string; error?: string }>),
};

// ---- compliance posture ----
export interface CFramework { id: string; name: string; short: string; authority: string; verified: boolean }
export interface CControl { id: string; theme: string; title: string; desc: string; unverified?: boolean; mappings: Record<string, string | null> }
export interface CScoreBucket { points: number; max: number; applicable: number; controls: number; pct: number }
export interface CScores { overall: number; byTheme: Record<string, CScoreBucket>; byFramework: Record<string, CScoreBucket>; version: string }
export interface CStatus { control_id: string; maturity: string; evidence: string; owner: string; updated_at: string }
export interface ComplianceProgram {
  version: string;
  frameworks: Record<string, CFramework>;
  maturity: Record<string, { value: number | null; label: string }>;
  themes: string[];
  controls: CControl[];
  statuses: Record<string, CStatus>;
  scores: CScores;
}
export const complianceApi = {
  get: () => fetch('/api/portal/compliance').then(json<ComplianceProgram>),
  update: (controlId: string, d: { maturity: string; evidence: string; owner: string }) =>
    fetch(`/api/portal/compliance/${controlId}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(d) }).then(json<{ ok: boolean; scores: CScores }>),
};
export const adminComplianceApi = {
  get: (clientId: number) => fetch(`/api/admin/clients/${clientId}/compliance`).then(json<ComplianceProgram>),
  update: (clientId: number, controlId: string, d: { maturity: string; evidence: string; owner: string }) =>
    fetch(`/api/admin/clients/${clientId}/compliance/${controlId}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(d) }).then(json<{ ok: boolean; scores: CScores }>),
};
