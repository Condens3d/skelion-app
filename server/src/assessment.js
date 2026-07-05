/**
 * Security Posture Assessment scoring engine.
 *
 * 15 questions across 5 domains, 3 answers each worth 0/1/2 points.
 * The server recomputes scores from raw answers so results cannot be forged
 * client-side. Question text lives in the frontend locales; ids and weights
 * are the contract shared between both sides.
 */

export const DOMAINS = ['gov', 'iam', 'infra', 'people', 'resilience'];

// domain -> question ids (3 each). Answer value: 0 (absent), 1 (partial), 2 (mature).
export const QUESTIONS = {
  gov: ['gov1', 'gov2', 'gov3'],
  iam: ['iam1', 'iam2', 'iam3'],
  infra: ['infra1', 'infra2', 'infra3'],
  people: ['people1', 'people2', 'people3'],
  resilience: ['res1', 'res2', 'res3'],
};

export const ALL_QUESTION_IDS = Object.values(QUESTIONS).flat();
export const MAX_TOTAL = ALL_QUESTION_IDS.length * 2; // 30
const MAX_DOMAIN = 6;

export function grade(pct) {
  if (pct >= 85) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 30) return 'D';
  return 'E';
}

/** answers: { [questionId]: 0|1|2 } with every id present. */
export function score(answers) {
  const domain_scores = {};
  let total = 0;
  for (const [domain, ids] of Object.entries(QUESTIONS)) {
    const pts = ids.reduce((acc, id) => acc + answers[id], 0);
    domain_scores[domain] = { points: pts, max: MAX_DOMAIN, pct: Math.round((pts / MAX_DOMAIN) * 100) };
    total += pts;
  }
  const pct = Math.round((total / MAX_TOTAL) * 100);
  return { domain_scores, total_score: total, pct, grade: grade(pct) };
}

export function reference(id) {
  return `SKL-A-${String(id).padStart(5, '0')}`;
}

export function submissionReference(id) {
  return `SKL-R-${String(id).padStart(5, '0')}`;
}
