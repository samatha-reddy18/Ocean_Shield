import mongoose from 'mongoose';

/**
 * Administrative audit trail for report review actions.
 * Records every verification, rejection, info-request, and comment action.
 */
const reviewLogSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HazardReport',
      required: true,
      index: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['verify', 'reject', 'request_info', 'comment', 'priority', 'reopen'],
      required: true,
    },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, default: '' },
    comment: { type: String, default: '', trim: true, maxlength: [1000, 'Comment too long'] },
  },
  { timestamps: true }
);

export default mongoose.model('ReviewLog', reviewLogSchema);
