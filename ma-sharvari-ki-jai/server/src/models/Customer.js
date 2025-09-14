const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    totalSpend: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
    tags: { type: [String], default: [] },
    attributes: { type: Object, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    externalCustomerId: { type: String, required: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ email: 1, createdBy: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ externalCustomerId: 1, createdBy: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ totalSpend: -1 });
CustomerSchema.index({ visitCount: -1 });
CustomerSchema.index({ lastOrderDate: -1 });

module.exports = mongoose.model('Customer', CustomerSchema);
