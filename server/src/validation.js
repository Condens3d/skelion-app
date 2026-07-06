import { z } from 'zod';
import { ALL_QUESTION_IDS } from './assessment.js';
import { CONTROL_IDS as COMPLIANCE_CONTROL_IDS } from './compliance.js';

export const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  organization: z.string().trim().max(200).optional().default(''),
  email: z.string().trim().email().max(254),
  service: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
  locale: z.enum(['en', 'fr']).optional().default('en'),
  website: z.string().max(0).optional().default(''), // honeypot
});

export const NewsletterSchema = z.object({
  email: z.string().trim().email().max(254),
  locale: z.enum(['en', 'fr']).optional().default('en'),
  website: z.string().max(0).optional().default(''), // honeypot
});

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PostSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(slugRe, 'slug must be lowercase words separated by hyphens'),
  tag: z.string().trim().max(60).optional().default(''),
  title_en: z.string().trim().min(1).max(200),
  title_fr: z.string().trim().min(1).max(200),
  excerpt_en: z.string().trim().max(400).optional().default(''),
  excerpt_fr: z.string().trim().max(400).optional().default(''),
  body_en: z.string().max(50000).optional().default(''),
  body_fr: z.string().max(50000).optional().default(''),
  published: z.boolean().optional().default(false),
});

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export const AssessmentSchema = z.object({
  name: z.string().trim().max(120).optional().default(''),
  organization: z.string().trim().max(160).optional().default(''),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]).optional().default(''),
  locale: z.enum(['en', 'fr']).default('en'),
  website: z.string().max(0).optional().default(''), // honeypot
  answers: z
    .record(z.string(), z.union([z.literal(0), z.literal(1), z.literal(2)]))
    .refine(
      (a) => ALL_QUESTION_IDS.every((id) => id in a) && Object.keys(a).length === ALL_QUESTION_IDS.length,
      { message: 'answers must cover exactly the defined question set' }
    ),
});

export const ClientSchema = z.object({ name: z.string().trim().min(2).max(160) });
export const ClientUserSchema = z.object({
  client_id: z.number().int().positive(),
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).optional().default(''),
  password: z.string().min(12).max(200),
});
export const EngagementSchema = z.object({
  client_id: z.number().int().positive(),
  title: z.string().trim().min(2).max(200),
  type: z.enum(['pentest', 'grc', 'vciso', 'training', 'physical', 'other']).default('pentest'),
  status: z.enum(['scoping', 'active', 'reporting', 'remediation', 'closed']).default('scoping'),
  summary: z.string().max(20000).optional().default(''),
  start_date: z.string().max(10).optional().default(''),
  end_date: z.string().max(10).optional().default(''),
});
export const FindingSchema = z.object({
  engagement_id: z.number().int().positive(),
  title: z.string().trim().min(2).max(240),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).default('medium'),
  cvss: z.number().min(0).max(10).nullable().optional().default(null),
  status: z.enum(['open', 'in_remediation', 'resolved', 'accepted_risk', 'closed']).default('open'),
  description: z.string().max(40000).optional().default(''),
  impact: z.string().max(20000).optional().default(''),
  remediation: z.string().max(20000).optional().default(''),
});

export const ComplianceStatusSchema = z.object({
  control_id: z.enum(COMPLIANCE_CONTROL_IDS),
  maturity: z.enum(['not_implemented', 'partial', 'implemented', 'optimized', 'not_applicable']),
  evidence: z.string().max(8000).optional().default(''),
  owner: z.string().max(160).optional().default(''),
});
