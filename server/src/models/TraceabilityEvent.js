import mongoose from 'mongoose';

const traceabilityEventSchema = new mongoose.Schema(
  {
    textile: { type: mongoose.Schema.Types.ObjectId, ref: 'Textile', required: true, index: true },
    eventType: { type: String, required: true, trim: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

traceabilityEventSchema.set('toJSON', {
  transform(_document, result) {
    delete result.__v;
    return result;
  }
});

export default mongoose.model('TraceabilityEvent', traceabilityEventSchema);