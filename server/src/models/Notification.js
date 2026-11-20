import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    link: { type: String, trim: true, maxlength: 200, default: '' },
    relatedTextile: { type: mongoose.Schema.Types.ObjectId, ref: 'Textile' },
    relatedPickup: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupRequest' },
    readAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  transform(_document, result) {
    delete result.__v;
    return result;
  }
});

export default mongoose.model('Notification', notificationSchema);
