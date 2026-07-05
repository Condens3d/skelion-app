import { z } from 'zod';
import { ALL_QUESTION_IDS } from './assessment.js';

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
