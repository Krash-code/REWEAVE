import mongoose from 'mongoose';

const collectionDriveSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: {
      city: { type: String, required: true, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      venue: { type: String, trim: true, maxlength: 200 }
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      required: true,
      index: true
    },
    targetWeightKg: { type: Number, min: 0, default: 0 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

collectionDriveSchema.set('toJSON', {
  transform(_document, result) {
    delete result.__v;
    return result;
  }
});

export default mongoose.model('CollectionDrive', collectionDriveSchema);
