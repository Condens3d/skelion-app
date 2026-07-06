/**
 * Compliance control library.
 *
 * IMPORTANT ACCURACY NOTE
 * -----------------------
 * ISO 27001:2022 Annex A and NIST CSF 2.0 are represented at control-family /
 * category level, which is stable and publicly documented. They are provided as
 * a working scaffold, NOT as a certified control set: before using these with a
 * client, a qualified GRC specialist must validate the wording and completeness
 * against the official standards.
 *
 * The COBAC and BEAC layer is a DELIBERATE PLACEHOLDER. I do not have the
 * current regional circulars verified, so those controls are marked
 * `unverified: true` and must be populated from the primary regulatory texts by
 * a compliance expert before any client-facing use. Do not present the
 * regional mapping as authoritative until that review is done.
 *
 * The library is versioned. When controls change, bump LIBRARY_VERSION so a
 * client's stored program can be reconciled against the revision it was built on.
 */

export const LIBRARY_VERSION = '2026.1';

export const FRAMEWORKS = {
  iso27001: { id: 'iso27001', name: 'ISO/IEC 27001:2022', short: 'ISO 27001', authority: 'ISO/IEC', verified: true },
  nistcsf: { id: 'nistcsf', name: 'NIST Cybersecurity Framework 2.0', short: 'NIST CSF', authority: 'NIST', verified: true },
  cobac: { id: 'cobac', name: 'COBAC / BEAC (regional banking supervision)', short: 'COBAC/BEAC', authority: 'COBAC, BEAC', verified: false },
};

// Maturity scale used per control. Weight feeds the score.
export const MATURITY = {
  not_implemented: { value: 0, label: 'Not implemented' },
  partial: { value: 1, label: 'Partially implemented' },
  implemented: { value: 2, label: 'Implemented' },
  optimized: { value: 3, label: 'Optimized / continuously improved' },
  not_applicable: { value: null, label: 'Not applicable' },
};
const MAX_MATURITY = 3;

/**
 * Controls. Each control is a unit of assessment. `mappings` cross-reference the
 * equivalent clause/category in other frameworks so answering one control rolls
 * up into every framework it touches. Grouped by ISO Annex A theme for coherence.
 */
export const CONTROLS = [
  // ---- Organizational (ISO A.5) ----
  { id: 'org-policies', theme: 'organizational', title: 'Information security policies',
    desc: 'Management-approved security policy set, communicated and reviewed at planned intervals.',
    mappings: { iso27001: 'A.5.1', nistcsf: 'GV.PO', cobac: null } },
  { id: 'org-roles', theme: 'organizational', title: 'Roles and responsibilities',
    desc: 'Security roles defined and allocated, including a named accountable owner at leadership level.',
    mappings: { iso27001: 'A.5.2', nistcsf: 'GV.RR', cobac: null } },
  { id: 'org-supplier', theme: 'organizational', title: 'Supplier and third-party risk',
    desc: 'Security requirements and monitoring for suppliers and outsourced services across the lifecycle.',
    mappings: { iso27001: 'A.5.19', nistcsf: 'GV.SC', cobac: null } },
  { id: 'org-threat-intel', theme: 'organizational', title: 'Threat intelligence',
    desc: 'Collection and analysis of threat information to inform protective action.',
    mappings: { iso27001: 'A.5.7', nistcsf: 'ID.RA', cobac: null } },
  { id: 'org-incident-mgmt', theme: 'organizational', title: 'Incident management',
    desc: 'Documented, tested process to detect, report, assess and respond to security incidents.',
    mappings: { iso27001: 'A.5.24', nistcsf: 'RS.MA', cobac: null } },
  { id: 'org-continuity', theme: 'organizational', title: 'Continuity of security',
    desc: 'ICT readiness and continuity so security is maintained during disruption (aligns ISO 22301).',
    mappings: { iso27001: 'A.5.29', nistcsf: 'RC.RP', cobac: null } },
  { id: 'org-legal', theme: 'organizational', title: 'Legal, regulatory and contractual compliance',
    desc: 'Identification and fulfilment of legal, statutory, regulatory and contractual requirements.',
    mappings: { iso27001: 'A.5.31', nistcsf: 'GV.OC', cobac: null } },

  // ---- People (ISO A.6) ----
  { id: 'ppl-screening', theme: 'people', title: 'Screening',
    desc: 'Background verification of candidates proportionate to business risk and classification.',
    mappings: { iso27001: 'A.6.1', nistcsf: 'PR.AA', cobac: null } },
  { id: 'ppl-awareness', theme: 'people', title: 'Awareness, education and training',
    desc: 'Ongoing security awareness and role-specific training, including phishing simulation.',
    mappings: { iso27001: 'A.6.3', nistcsf: 'PR.AT', cobac: null } },
  { id: 'ppl-remote', theme: 'people', title: 'Remote and mobile working',
    desc: 'Security measures for remote work and personal-device use of company data.',
    mappings: { iso27001: 'A.6.7', nistcsf: 'PR.AA', cobac: null } },

  // ---- Physical (ISO A.7) ----
  { id: 'phy-perimeter', theme: 'physical', title: 'Physical security perimeters and entry',
    desc: 'Secure areas, entry controls and protection of facilities housing information assets.',
    mappings: { iso27001: 'A.7.1', nistcsf: 'PR.AA', cobac: null } },
  { id: 'phy-equipment', theme: 'physical', title: 'Equipment and media protection',
    desc: 'Protection, maintenance and secure disposal of equipment and storage media.',
    mappings: { iso27001: 'A.7.10', nistcsf: 'PR.DS', cobac: null } },

  // ---- Technological (ISO A.8) ----
  { id: 'tec-access', theme: 'technological', title: 'Access control and identity',
    desc: 'Access provisioning, review and revocation on the least-privilege principle.',
    mappings: { iso27001: 'A.8.2', nistcsf: 'PR.AA', cobac: null } },
  { id: 'tec-mfa', theme: 'technological', title: 'Strong / multi-factor authentication',
    desc: 'MFA enforced for privileged and remote access; secure authentication throughout.',
    mappings: { iso27001: 'A.8.5', nistcsf: 'PR.AA', cobac: null } },
  { id: 'tec-privileged', theme: 'technological', title: 'Privileged access management',
    desc: 'Separation, restriction and monitoring of privileged (administrative) accounts.',
    mappings: { iso27001: 'A.8.2', nistcsf: 'PR.AA', cobac: null } },
  { id: 'tec-crypto', theme: 'technological', title: 'Cryptography and key management',
    desc: 'Policy-driven use of cryptography and lifecycle management of keys.',
    mappings: { iso27001: 'A.8.24', nistcsf: 'PR.DS', cobac: null } },
  { id: 'tec-backup', theme: 'technological', title: 'Backup and restore',
    desc: 'Backups aligned to a policy and, critically, tested by actual restoration.',
    mappings: { iso27001: 'A.8.13', nistcsf: 'RC.RP', cobac: null } },
  { id: 'tec-logging', theme: 'technological', title: 'Logging and monitoring',
    desc: 'Events logged, protected and reviewed; monitoring for anomalous activity.',
    mappings: { iso27001: 'A.8.15', nistcsf: 'DE.CM', cobac: null } },
  { id: 'tec-vuln', theme: 'technological', title: 'Technical vulnerability management',
    desc: 'Timely identification, evaluation and remediation of technical vulnerabilities; patch SLAs.',
    mappings: { iso27001: 'A.8.8', nistcsf: 'ID.RA', cobac: null } },
  { id: 'tec-pentest', theme: 'technological', title: 'Security testing and assurance',
    desc: 'Independent penetration testing and security validation on a defined cadence.',
    mappings: { iso27001: 'A.8.29', nistcsf: 'ID.RA', cobac: null } },
  { id: 'tec-malware', theme: 'technological', title: 'Protection against malware',
    desc: 'Detection, prevention and recovery controls against malicious code, with user awareness.',
    mappings: { iso27001: 'A.8.7', nistcsf: 'PR.PS', cobac: null } },
  { id: 'tec-network', theme: 'technological', title: 'Network security and segregation',
    desc: 'Network controls, segregation and secure configuration to contain compromise.',
    mappings: { iso27001: 'A.8.20', nistcsf: 'PR.IR', cobac: null } },
  { id: 'tec-secure-dev', theme: 'technological', title: 'Secure development',
    desc: 'Security in the development lifecycle: secure coding, testing, and change control.',
    mappings: { iso27001: 'A.8.25', nistcsf: 'PR.PS', cobac: null } },

  // ---- Regional banking supervision (UNVERIFIED SCAFFOLD) ----
  { id: 'reg-ict-risk', theme: 'regional', title: 'ICT risk governance (regional banking)',
    desc: 'PLACEHOLDER: governance of ICT and security risk expected of supervised financial institutions. Populate from the current COBAC/BEAC circular.',
    unverified: true, mappings: { cobac: 'TBD', iso27001: 'A.5.1', nistcsf: 'GV.RM' } },
  { id: 'reg-incident-report', theme: 'regional', title: 'Regulatory incident reporting (regional banking)',
    desc: 'PLACEHOLDER: obligations to report major security or operational incidents to the supervisor within mandated timeframes. Populate from the current COBAC/BEAC circular.',
    unverified: true, mappings: { cobac: 'TBD', iso27001: 'A.5.24', nistcsf: 'RS.CO' } },
  { id: 'reg-continuity', theme: 'regional', title: 'Operational resilience and continuity (regional banking)',
    desc: 'PLACEHOLDER: business continuity and operational resilience expectations for financial institutions. Populate from the current COBAC/BEAC circular.',
    unverified: true, mappings: { cobac: 'TBD', iso27001: 'A.5.29', nistcsf: 'RC.RP' } },
  { id: 'reg-outsourcing', theme: 'regional', title: 'Outsourcing and cloud oversight (regional banking)',
    desc: 'PLACEHOLDER: supervisory expectations on outsourcing, cloud use and data localization. Populate from the current COBAC/BEAC circular.',
    unverified: true, mappings: { cobac: 'TBD', iso27001: 'A.5.19', nistcsf: 'GV.SC' } },
];

export const THEMES = ['organizational', 'people', 'physical', 'technological', 'regional'];
export const CONTROL_IDS = CONTROLS.map((c) => c.id);
const CONTROL_MAP = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));

/**
 * Compute program scores from stored statuses.
 * statuses: { [controlId]: { maturity: keyof MATURITY, ... } }
 * Not-applicable controls are excluded from denominators (industry-standard).
 */
export function computeScores(statuses) {
  const perTheme = {};
  const perFramework = {};
  for (const th of THEMES) perTheme[th] = { points: 0, max: 0, applicable: 0, controls: 0 };
  for (const fw of Object.keys(FRAMEWORKS)) perFramework[fw] = { points: 0, max: 0, applicable: 0, controls: 0 };

  for (const control of CONTROLS) {
    const st = statuses[control.id];
    const key = st?.maturity || 'not_implemented';
    const m = MATURITY[key] ?? MATURITY.not_implemented;
    const na = m.value === null;

    perTheme[control.theme].controls += 1;
    if (!na) { perTheme[control.theme].points += m.value; perTheme[control.theme].max += MAX_MATURITY; perTheme[control.theme].applicable += 1; }

    for (const fw of Object.keys(FRAMEWORKS)) {
      if (control.mappings[fw]) {
        perFramework[fw].controls += 1;
        if (!na) { perFramework[fw].points += m.value; perFramework[fw].max += MAX_MATURITY; perFramework[fw].applicable += 1; }
      }
    }
  }

  const pct = (o) => (o.max > 0 ? Math.round((o.points / o.max) * 100) : 0);
  for (const o of Object.values(perTheme)) o.pct = pct(o);
  for (const o of Object.values(perFramework)) o.pct = pct(o);

  const totalPoints = Object.values(perTheme).reduce((a, o) => a + o.points, 0);
  const totalMax = Object.values(perTheme).reduce((a, o) => a + o.max, 0);
  const overall = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;

  return { overall, byTheme: perTheme, byFramework: perFramework, version: LIBRARY_VERSION };
}

export function getControl(id) { return CONTROL_MAP[id] || null; }
