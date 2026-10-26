import HazardReport from '../models/HazardReport.js';
import ReviewLog from '../models/ReviewLog.js';
import User from '../models/User.js';
import { updateStatusSchema } from '../validators/reportValidator.js';
import { recalculatePriority } from '../services/priorityService.js';
import { notifyUser } from '../services/notificationService.js';
import { emitToUser, emitToAdmins } from '../services/sseService.js';

// GET /api/admin/dashboard — dashboard statistics from actual database records
export async function getDashboardStats(req, res) {
  const [
    total,
    pending,
    verified,
    rejected,
    underReview,
    infoRequested,
    byCategory,
    byVerification,
    byAiStatus,
    byDay,
    recent,
    highPriorityCount,
    totalUsers,
  ] = await Promise.all([
    HazardReport.countDocuments(),
    HazardReport.countDocuments({ verificationStatus: 'pending' }),
    HazardReport.countDocuments({ verificationStatus: 'verified' }),
    HazardReport.countDocuments({ verificationStatus: 'rejected' }),
    HazardReport.countDocuments({ verificationStatus: 'under_review' }),
    HazardReport.countDocuments({ verificationStatus: 'info_requested' }),
    HazardReport.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    HazardReport.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]),
    HazardReport.aggregate([{ $group: { _id: '$aiStatus', count: { $sum: 1 } } }]),
    HazardReport.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 90 },
    ]),
    HazardReport.find().sort('-createdAt').limit(8).populate('user', 'name').lean(),
    HazardReport.countDocuments({ priority: 'high' }),
    User.countDocuments(),
  ]);

  res.json({
    totals: {
      total,
      pending,
      verified,
      rejected,
      underReview,
      infoRequested,
      highPriority: highPriorityCount,
      totalUsers,
    },
    byCategory,
    byVerification,
    byAiStatus,
    overTime: byDay.map((d) => ({ date: d._id, count: d.count })),
    recent,
    generatedAt: new Date().toISOString(),
  });
}

// GET /api/admin/reports — list reports for admin review with filters + pagination
export async function getReportsForReview(req, res) {
  const {
    status,
    category,
    priority,
    aiStatus,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = req.query;

  const filter = {};
  if (status) filter.verificationStatus = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (aiStatus) filter.aiStatus = aiStatus;

  const skip = Math.max((parseInt(page, 10) - 1) * parseInt(limit, 10), 0);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  const [items, total] = await Promise.all([
    HazardReport.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'name email')
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

// PATCH /api/admin/reports/:id/status — update verification status with audit log
export async function updateReportStatus(req, res) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors.map((e) => e.message).join(', ') });
  }
  const { verificationStatus, comment, severity } = parsed.data;

  const report = await HazardReport.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  const fromStatus = report.verificationStatus;

  // Determine action label for audit log
  const actionMap = {
    verified: 'verify',
    rejected: 'reject',
    info_requested: 'request_info',
    under_review: 'comment',
    pending: 'reopen',
  };
  const action = actionMap[verificationStatus] || 'comment';

  // Update report
  report.verificationStatus = verificationStatus;
  if (severity) report.severity = severity;
  if (comment) {
    report.reviewComments.push({
      comment,
      action,
      admin: req.user._id,
      createdAt: new Date(),
    });
  }
  report.history.push({
    action,
    fromStatus,
    toStatus: verificationStatus,
    changedBy: req.user._id,
    note: comment,
    at: new Date(),
  });

  await report.save();

  // Recalculate priority (severity may have changed)
  recalculatePriority(report).catch(() => null);

  // Audit trail
  await ReviewLog.create({
    report: report._id,
    admin: req.user._id,
    action,
    fromStatus,
    toStatus: verificationStatus,
    comment,
  });

  // Notify the report owner
  await notifyUser({
    recipient: report.user,
    report: report._id,
    type: 'verification',
    title: `Report status updated: ${verificationStatus.replace('_', ' ')}`,
    message: `Your report "${report.title}" (${report.reportId}) is now ${verificationStatus.replace('_', ' ')}.${comment ? ' Reviewer note: ' + comment : ''}`,
  }).catch(() => null);

  // Push real-time update to the report owner so their dashboard refreshes
  emitToUser(String(report.user), 'report_updated', {
    _id: report._id,
    reportId: report.reportId,
    title: report.title,
    verificationStatus,
    severity: report.severity,
  });

  // Push dashboard_refresh to all admins so their stats stay current
  emitToAdmins('dashboard_refresh', { trigger: 'status_update', reportId: report.reportId }).catch(() => null);

  res.json({
    message: 'Report status updated',
    report,
    audit: { action, fromStatus, toStatus: verificationStatus, comment },
  });
}

// GET /api/admin/review-logs — administrative review history
export async function getReviewLogs(req, res) {
  const { reportId, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (reportId) filter.report = reportId;

  const skip = Math.max((parseInt(page, 10) - 1) * parseInt(limit, 10), 0);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  const [items, total] = await Promise.all([
    ReviewLog.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .populate('admin', 'name')
      .populate('report', 'reportId title')
      .lean(),
    ReviewLog.countDocuments(filter),
  ]);

  res.json({ items, page: parseInt(page, 10), limit: limitNum, total });
}

export default { getDashboardStats, getReportsForReview, updateReportStatus, getReviewLogs };
