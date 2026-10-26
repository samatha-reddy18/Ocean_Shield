import { z } from 'zod';

export const CATEGORIES = [
  'oil_spill',
  'plastic_pollution',
  'marine_debris',
  'coastal_pollution',
  'algal_bloom',
  'dead_marine_animals',
  'other',
];

export const createReportSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Invalid hazard category' }) }),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  // coerce handles FormData submissions, where numbers arrive as strings
  latitude: z.coerce.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z.coerce.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
  observationDate: z.coerce.date(),
});

export const updateReportSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
  observationDate: z.coerce.date().optional(),
});

export const updateStatusSchema = z.object({
  verificationStatus: z.enum(['pending', 'under_review', 'verified', 'rejected', 'info_requested']),
  comment: z.string().trim().max(1000).optional().default(''),
  severity: z.enum(['unassigned', 'low', 'medium', 'high']).optional(),
});

export const checkDuplicatesSchema = z.object({
  reportId: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  category: z.enum(CATEGORIES).optional(),
  description: z.string().optional(),
  observationDate: z.coerce.date().optional(),
});
