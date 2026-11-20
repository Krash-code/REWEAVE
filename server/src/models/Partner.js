import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 30 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    location: {
      city: { type: String, required: true, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      address: { type: String, trim: true, maxlength: 200 }
    },
    supportedPathways: {
      type: [String],
      enum: ['reuse', 'donation', 'resale', 'repair', 'upcycling', 'recycling', 'manual_assessment'],
      required: true
    },
    acceptedMaterials: {
      type: [String],
      enum: ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown'],
      default: ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown']
    },
    acceptedConditions: {
      type: [String],
      enum: ['good', 'repairable', 'damaged', 'unknown'],
      default: ['good', 'repairable', 'damaged']
    },
    capacityKgPerMonth: { type: Number, min: 0, default: 1000 },
    currentLoadKg: { type: Number, min: 0, default: 0 },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      required: true,
      index: true
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    verificationNotes: { type: String, trim: true, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

partnerSchema.set('toJSON', {
  transform(_document, result) {
    delete result.__v;
    return result;
  }
});

export default mongoose.model('Partner', partnerSchema);
