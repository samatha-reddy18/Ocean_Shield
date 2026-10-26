import HazardReport from '../models/HazardReport.js';
import { analyzeImage, analyzeText, checkDuplicates, checkAiHealth } from '../services/aiService.js';
import { findPotentialDuplicates } from '../services/duplicateService.js';
import { checkDuplicatesSchema } from '../validators/reportValidator.js';
import path from 'path';

// GET /api/ai/health
export async function getAiHealth(_req, res) {
  const health = await checkAiHealth();
  res.json(health);
}

// POST /api/ai/analyze-image — analyze a report's first image
// Body: { reportId }
export async function analyzeReportImage(req, res) {
  const { reportId } = req.body;
  if (!reportId) return res.status(400).json({ message: 'reportId is required' });

  const report = await HazardReport.findById(reportId);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  // Authorization: owner, researcher, or admin
  const isOwner = String(report.user) === String(req.user?._id);
  if (!isOwner && req.user?.role === 'citizen') {
    return res.status(403).json({ message: 'Not authorized to analyze this report' });
  }

  if (!report.images || report.images.length === 0) {
    return res.status(400).json({ message: 'No image available for analysis' });
  }

  report.aiStatus = 'processing';
  await report.save();

  try {
    // Resolve a local file path for the image
    let imagePath = report.images[0].url;
    if (imagePath.startsWith('/uploads')) {
      imagePath = path.resolve(process.cwd(), imagePath.replace(/^\//, ''));
    } else if (/^https?:\/\//.test(imagePath)) {
      // Cloudinary/remote image: the AI service downloads it from the URL.
      // analyzeImage expects a local path; for remote we pass the URL through
      // by writing a tiny shim. For simplicity here we error gracefully.
      return res.status(400).json({
        message: 'Remote image analysis requires the AI service to fetch the URL. Configure local storage or implement URL passthrough.',
      });
    }

    const result = await analyzeImage(imagePath);
    report.aiStatus = 'completed';
    report.aiPrediction = {
      category: result.category || '',
      confidence: result.confidence || 0,
      allScores: result.allScores || {},
      modelVersion: result.modelVersion || '',
      analyzedAt: new Date(),
    };
    await report.save();

    res.json({
      reportId: report._id,
      aiStatus: report.aiStatus,
      prediction: report.aiPrediction,
      note: 'AI output is an automated assessment, not a confirmed environmental finding.',
    });
  } catch (err) {
    report.aiStatus = 'failed';
    await report.save();
    res.status(502).json({
      message: 'AI service unavailable or failed',
      aiStatus: report.aiStatus,
      error: err.message,
    });
  }
}

// POST /api/ai/analyze-text — NLP extraction on a description
export async function analyzeTextHandler(req, res) {
  const { description, reportId } = req.body;
  if (!description) return res.status(400).json({ message: 'description is required' });

  try {
    const result = await analyzeText(description);

    // Optionally persist onto a report
    if (reportId) {
      const report = await HazardReport.findById(reportId);
      if (report) {
        report.nlpAnalysis = {
          keywords: result.keywords || [],
          phrases: result.phrases || [],
          locationReferences: result.locationReferences || [],
          summary: result.summary || '',
          missingInfo: result.missingInfo || [],
          analyzedAt: new Date(),
        };
        await report.save();
      }
    }

    res.json({ analysis: result });
  } catch (err) {
    res.status(502).json({ message: 'AI NLP service unavailable', error: err.message });
  }
}

// POST /api/ai/check-duplicates — duplicate detection
export async function checkDuplicatesHandler(req, res) {
  const parsed = checkDuplicatesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => e.message).join(', ') });
  }

  let target = parsed.data;
  let report = null;

  // If reportId given, load the report as the target
  if (parsed.data.reportId) {
    report = await HazardReport.findById(parsed.data.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    target = {
      _id: report._id,
      latitude: report.latitude,
      longitude: report.longitude,
      category: report.category,
      description: report.description,
      observationDate: report.observationDate,
      user: report.user,
    };
  }

  // Try the AI service first, fall back to rule-based detection
  try {
    const result = await checkDuplicates(target);
    return res.json({ source: 'ai-service', duplicates: result.duplicates || [] });
  } catch (_err) {
    const matches = await findPotentialDuplicates(
      report || { ...target, _id: null },
      { excludeOwn: false }
    );
    return res.json({
      source: 'rule-based',
      duplicates: matches.map((m) => ({
        reportId: m.reportId,
        score: m.score,
        reasons: m.reasons,
      })),
    });
  }
}

export default { getAiHealth, analyzeReportImage, analyzeTextHandler, checkDuplicatesHandler };
