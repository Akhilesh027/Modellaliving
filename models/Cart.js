const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  products: [
    {
      productId: String,
      name: String,
      images: [String],
      sku: String,
      stock: String,
      price: Number,
      quantity: Number,
      color: String,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Cart", CartSchema);
