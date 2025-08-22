const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  price: Number,
  image: String,
  quantity: {
    type: Number,
    default: 1,
  },
});

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: String,
  email: String,
  phone: String,
  address: String,
  state: String,
  pincode: String,
  paymentMethod: String,
  subtotal: Number,
  shipping: Number,
  total: Number,
  products: [OrderItemSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', OrderSchema);
