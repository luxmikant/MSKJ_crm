const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    segmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Segment', required: true, index: true },
    channel: { type: String, enum: ['EMAIL', 'SMS'], required: true },
    template: { type: String, required: true },
    subject: { type: String, trim: true },
    preheader: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'scheduled', 'running', 'completed', 'paused', 'failed'], default: 'draft', index: true },
    scheduleType: { type: String, enum: ['now', 'scheduled', 'draft'], default: 'draft' },
    scheduleDate: { type: Date },
    scheduleTime: { type: String },
    scheduledFor: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    trackOpens: { type: Boolean, default: true },
    trackClicks: { type: Boolean, default: true },
    counts: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
    },
    metrics: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
    },
    performance: {
      openRate: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', CampaignSchema);
