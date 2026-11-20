import mongoose from 'mongoose';

const textileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: { type: String, required: true, trim: true, maxlength: 100 },
    material: {
      type: String,
      enum: ['cotton', 'denim', 'polyester', 'wool', 'silk', 'nylon', 'mixed', 'unknown'],
      required: true
    },
    condition: {
      type: String,
      enum: ['good', 'repairable', 'damaged', 'unknown'],
      required: true
    },
    quantity: { type: Number, required: true, min: 1 },
    quantityUnit: { type: String, enum: ['items', 'kg'], required: true },
    estimatedWeightKg: { type: Number, min: 0 },
    photos: { type: [String], default: [] },
    location: {
      city: { type: String, required: true, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 }
    },
    status: {
      type: String,
      enum: ['registered', 'recommended', 'requested', 'collected', 'confirmed', 'awaiting_match', 'rejected', 'cancelled'],
      default: 'registered',
      required: true
    },
    recommendedPathways: {
      type: [
        {
          pathway:    { type: String, required: true },
          confidence: { type: String, enum: ['high', 'medium', 'low'], required: true },
          reason:     { type: String, default: '' }
        }
      ],
      default: []
    },
    matchedPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    selectedPathway: { type: String, default: null },
    collectionDrive: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionDrive', default: null, index: true },
    refId: { type: String, required: true, unique: true, immutable: true }
  },
  { timestamps: true }
);

export default mongoose.model('Textile', textileSchema);