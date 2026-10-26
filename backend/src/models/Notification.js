import mongoose from 'mongoose';

/**
 * In-app notifications for users and admins.
 * Initially in-app only; email integration can be added later.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HazardReport',
      default: null,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['submission', 'verification', 'info_request', 'related_report', 'review_alert'],
      default: 'submission',
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
