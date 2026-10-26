import mongoose from 'mongoose';

/**
 * Optional collection storing metadata for satellite products actually
 * retrieved through the Copernicus integration. Only persisted for products
 * that have genuinely been fetched from the upstream API.
 */
const satelliteObservationSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    satellite: {
      type: String,
      enum: ['sentinel-1', 'sentinel-2', 'sentinel-3', 'other'],
      required: true,
    },
    title: { type: String, default: '' },
    acquisitionDate: { type: Date, default: null },
    footprint: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      coordinates: { type: [[[Number]]], default: [] },
    },
    cloudCover: { type: Number, default: null },
    status: {
      type: String,
      enum: ['available', 'unavailable', 'auth_failed', 'error'],
      default: 'available',
    },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HazardReport',
      default: null,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

satelliteObservationSchema.index({ satellite: 1, acquisitionDate: -1 });

export default mongoose.model('SatelliteObservation', satelliteObservationSchema);
