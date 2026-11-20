import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['individual', 'institution', 'partner', 'admin'],
      default: 'individual',
      required: true
    }
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform(_document, result) {
    delete result.passwordHash;
    delete result.__v;
    return result;
  }
});

export default mongoose.model('User', userSchema);