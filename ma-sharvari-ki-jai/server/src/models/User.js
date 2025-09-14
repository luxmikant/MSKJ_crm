const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    picture: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
