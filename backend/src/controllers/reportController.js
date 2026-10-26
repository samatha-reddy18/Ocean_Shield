import HazardReport from '../models/HazardReport.js';
import { createReportSchema, updateReportSchema } from '../validators/reportValidator.js';
import { uploadImages, deleteImage } from '../services/storageService.js';
import { findPotentialDuplicates } from '../services/duplicateService.js';
import { analyzeText } from '../services/aiService.js';
import { recalculatePriority } from '../services/priorityService.js';
import { notifyAdmins, notifyUser } from '../services/notificationService.js';
import { emitToUser, emitToAdmins, broadcast } from '../services/sseService.js';

// POST /api/reports — create a hazard report (with optional images)
export async function createReport(req, res) {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') });
  }
  const { title, category, description, latitude, longitude, observationDate } = parsed.data;

  const images = req.files ? await uploadImages(req.files) : [];

  const report = new HazardReport({
    reportId: HazardReport.generateReportId(),
    title,
    category,
    description,
    images,
    latitude,
    longitude,
    location: { type: 'Point', coordinates: [longitude, latitude] },
    observationDate,
    user: req.user._id,
    verificationStatus: 'pending',
    aiStatus: 'pending',
  });

  await report.save();

  // Async enrichment: NLP, duplicates, priority. Errors never block the report.
  enrichReport(report, req.files).catch((err) => {
    console.error('Report enrichment failed:', err.message);
  });

  // Notify admins of a new report
  await notifyAdmins({
    report: report._id,
    type: 'review_alert',
    title: 'New hazard report submitted',
    message: `"${report.title}" (${category}) awaiting review — ${report.reportId}`,
  }).catch(() => null);

  // Notify the user their submission was received
  await notifyUser({
    recipient: req.user._id,
    report: report._id,
    type: 'submission',
    title: 'Report submitted successfully',
    message: `Your report "${report.title}" (${report.reportId}) has been received and is pending review.`,
  }).catch(() => null);

  // Broadcast new report event so all connected clients refresh map/dashboard
  broadcast('report_created', {
    _id: report._id,
    reportId: report.reportId,
    title: report.title,
    category: report.category,
    latitude: report.latitude,
    longitude: report.longitude,
    verificationStatus: report.verificationStatus,
  });

  res.status(201).json(report);
}

/**
 * Background enrichment: NLP extraction, duplicate detection, priority.
 * AI image classification is triggered separately via the /api/ai endpoint
 * once a single best image is selected, to keep this path fast.
 */
async function enrichReport(report, files) {
  // 1. NLP text analysis (best-effort)
  try {
    const nlp = await analyzeText(report.description);
    report.nlpAnalysis = {
      keywords: nlp.keywords || [],
      phrases: nlp.phrases || [],
      locationReferences: nlp.locationReferences || [],
      summary: nlp.summary || '',
      missingInfo: nlp.missingInfo || [],
      analyzedAt: new Date(),
    };
  } catch (err) {
    console.error('NLP unavailable:', err.message);
  }

  // 2. Duplicate detection (always runs; rule-based fallback)
  try {
    const duplicates = await findPotentialDuplicates(report, { excludeOwn: false });
    report.possibleDuplicates = duplicates.map((d) => ({
      reportId: d.reportId,
      score: d.score,
      reasons: d.reasons,
      reviewed: false,
    }));
  } catch (err) {
    console.error('Duplicate detection failed:', err.message);
  }

  // 3. Priority scoring
  try {
    await recalculatePriority(report);
  } catch (err) {
    console.error('Priority calc failed:', err.message);
  }

  await report.save();
}

// GET /api/reports — public list with filters + pagination
export async function getReports(req, res) {
  const {
    category,
    verificationStatus,
    startDate,
    endDate,
    page = 1,
    limit = 12,
    sort = '-createdAt',
  } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (startDate || endDate) {
    filter.observationDate = {};
    if (startDate) filter.observationDate.$gte = new Date(startDate);
    if (endDate) filter.observationDate.$lte = new Date(endDate);
  }

  const skip = Math.max((parseInt(page, 10) - 1) * parseInt(limit, 10), 0);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  const [items, total] = await Promise.all([
    HazardReport.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name')
      .lean(),
    HazardReport.countDocuments(filter),
  ]);

  res.json({
    items,
    page: parseInt(page, 10),
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1,
  });
}

// GET /api/reports/my — current user's reports
export async function getMyReports(req, res) {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.verificationStatus = status;

  const skip = Math.max((parseInt(page, 10) - 1) * parseInt(limit, 10), 0);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  const [items, total] = await Promise.all([
    HazardReport.find(filter).sort('-createdAt').skip(skip).limit(limitNum).lean(),
    HazardReport.countDocuments(filter),
  ]);

  res.json({
    items,
    page: parseInt(page, 10),
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1,
  });
}

// GET /api/reports/:id — single report details
export async function getReportById(req, res) {
  const report = await HazardReport.findById(req.params.id)
    .populate('user', 'name')
    .populate('possibleDuplicates.reportId', 'reportId title category')
    .populate('reviewComments.admin', 'name')
    .lean();

  if (!report) return res.status(404).json({ message: 'Report not found' });

  // Ownership check for sensitive fields: only owner or admin see user email/phone etc.
  const isOwner = String(report.user?._id || report.user) === String(req.user?._id);
  if (!isOwner && req.user?.role !== 'admin' && req.user?.role !== 'researcher') {
    // Citizens can only view their own private report details unless it's verified/public.
    // Public map already exposes verified/pending; we keep details open per requirements.
  }

  res.json(report);
}

// PATCH /api/reports/:id — owner updates a permitted report
export async function updateReport(req, res) {
  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') });
  }

  const report = await HazardReport.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  // Ownership check — one user cannot edit another user's report
  if (String(report.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not authorized to edit this report' });
  }

  // Only allow edits while the report is still in an editable state
  if (['verified', 'rejected'].includes(report.verificationStatus) && req.user.role !== 'admin') {
    return res.status(409).json({ message: 'Verified or rejected reports cannot be edited' });
  }

  Object.assign(report, parsed.data);
  report.history.push({
    action: 'updated',
    changedBy: req.user._id,
    note: 'Report fields updated by owner',
  });
  await report.save();
  res.json(report);
}

// DELETE /api/reports/:id — owner or admin deletes a report
export async function deleteReport(req, res) {
  const report = await HazardReport.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  if (String(report.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You are not authorized to delete this report' });
  }

  // Best-effort image cleanup
  for (const img of report.images || []) {
    await deleteImage(img.publicId).catch(() => null);
  }

  report.history.push({
    action: 'deleted',
    changedBy: req.user._id,
    note: 'Report deleted',
  });
  await report.save();

  await report.deleteOne();
  res.json({ message: 'Report deleted successfully', id: req.params.id });
}

export default { createReport, getReports, getMyReports, getReportById, updateReport, deleteReport };
