const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderTotal: { type: Number, required: true },
    items: { type: [OrderItemSchema], default: [] },
    orderDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'], default: 'PLACED' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    externalOrderId: { type: String, required: true },
  },
  { timestamps: true }
);

OrderSchema.index({ externalOrderId: 1, createdBy: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', OrderSchema);
