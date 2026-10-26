import mongoose from 'mongoose';

const CATEGORIES = [
  'oil_spill',
  'plastic_pollution',
  'marine_debris',
  'coastal_pollution',
  'algal_bloom',
  'dead_marine_animals',
  'other',
];

const VERIFICATION_STATUSES = [
  'pending', // initial review status
  'under_review',
  'verified',
  'rejected',
  'info_requested',
];

const AI_STATUSES = ['pending', 'processing', 'completed', 'unavailable', 'failed'];

const PRIORITY_LEVELS = ['low', 'medium', 'high'];

const hazardReportSchema = new mongoose.Schema(
  {
    // Human-readable unique identifier
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [160, 'Title cannot exceed 160 characters'],
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: [true, 'Category is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
      },
    ],
    // Raw coordinates for display + querying
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90],
      max: [90],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180],
      max: [180],
    },
    // GeoJSON point for 2dsphere geospatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
    },
    observationDate: {
      type: Date,
      required: [true, 'Observation date is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'pending',
      index: true,
    },
    // AI image classification results
    aiStatus: {
      type: String,
      enum: AI_STATUSES,
      default: 'pending',
      index: true,
    },
    aiPrediction: {
      category: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      allScores: { type: Map, of: Number, default: {} },
      modelVersion: { type: String, default: '' },
      analyzedAt: { type: Date, default: null },
    },
    // NLP extraction results
    nlpAnalysis: {
      keywords: [{ type: String }],
      phrases: [{ type: String }],
      locationReferences: [{ type: String }],
      summary: { type: String, default: '' },
      missingInfo: [{ type: String }],
      analyzedAt: { type: Date, default: null },
    },
    // Potential duplicates flagged for admin review
    possibleDuplicates: [
      {
        reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'HazardReport' },
        score: { type: Number, default: 0 },
        reasons: [{ type: String }],
        reviewed: { type: Boolean, default: false },
      },
    ],
    reviewComments: [
      {
        comment: { type: String, required: true },
        action: { type: String, default: '' },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Administrator-assigned severity / priority
    severity: {
      type: String,
      enum: ['unassigned', 'low', 'medium', 'high'],
      default: 'unassigned',
    },
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'low',
    },
    priorityScore: {
      type: Number,
      default: 0,
    },
    isSensitiveArea: {
      type: Boolean,
      default: false,
    },
    // Track report history
    history: [
      {
        action: { type: String, required: true },
        fromStatus: { type: String, default: '' },
        toStatus: { type: String, default: '' },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries
hazardReportSchema.index({ location: '2dsphere' });
// Compound indexes for common dashboard queries
hazardReportSchema.index({ category: 1, verificationStatus: 1 });
hazardReportSchema.index({ createdAt: -1 });

/**
 * Generate a human-readable report identifier like OS-20261026-A1B2C3
 */
hazardReportSchema.statics.generateReportId = function () {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OS-${ymd}-${rand}`;
};

export const HAZARD_CATEGORIES = CATEGORIES;
export const VERIFICATION_STATUS_VALUES = VERIFICATION_STATUSES;
export default mongoose.model('HazardReport', hazardReportSchema);
