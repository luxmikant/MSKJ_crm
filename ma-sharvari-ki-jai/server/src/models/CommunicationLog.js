const mongoose = require('mongoose');

const CommunicationLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    channel: { type: String, enum: ['EMAIL', 'SMS'], required: true },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'DELIVERED', 'OPENED', 'CLICKED'], default: 'PENDING', index: true },
    vendorMessageId: { type: String },
    payload: { type: Object },
    error: { type: String },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    bouncedAt: { type: Date },
    bounceReason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

CommunicationLogSchema.index({ campaignId: 1, status: 1, createdAt: -1 });
CommunicationLogSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('CommunicationLog', CommunicationLogSchema);
