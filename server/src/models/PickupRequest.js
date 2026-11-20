import mongoose from 'mongoose';

const pickupRequestSchema = new mongoose.Schema(
  {
    textile: { type: mongoose.Schema.Types.ObjectId, ref: 'Textile', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    pathway: { type: String, required: true, trim: true },
    transferType: {
      type: String,
      enum: ['pickup', 'drop_off'],
      default: 'pickup',
      required: true
    },
    scheduledDate: { type: Date },
    timeSlot: { type: String, trim: true, maxlength: 50 },
    pickupAddress: {
      street: { type: String, trim: true, maxlength: 200 },
      city: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      postalCode: { type: String, trim: true, maxlength: 20 }
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['requested', 'scheduled', 'collected', 'confirmed', 'rejected', 'cancelled'],
      default: 'requested',
      required: true,
      index: true
    },
    collectedAt: { type: Date },
    inspectedAt: { type: Date },
    inspection: {
      actualWeightKg: { type: Number, min: 0 },
      verifiedMaterial: { type: String, trim: true },
      actualCondition: { type: String, trim: true },
      finalPathway: { type: String, trim: true },
      processingNotes: { type: String, trim: true, maxlength: 1000 },
      proofImageUrl: { type: String, trim: true },
      rejectionReason: { type: String, trim: true, maxlength: 500 },
      rejectionKind: {
        type: String,
        enum: ['handover', 'processing_unsuccessful'],
        default: undefined
      },
      outcomeDate: { type: Date }
    }
  },
  { timestamps: true }
);

pickupRequestSchema.set('toJSON', {
  transform(_document, result) {
    delete result.__v;
    return result;
  }
});

export default mongoose.model('PickupRequest', pickupRequestSchema);
