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
