const mongoose = require('mongoose');

const SegmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    rules: { type: Object, required: true },
    logicBlocks: [{ type: { type: String, enum: ['AND', 'OR'] } }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    audienceSize: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date },
    performance: {
      openRate: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Segment', SegmentSchema);
