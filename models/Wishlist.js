const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true },
      images: [String],
      sku: { type: String },
      stock: { type: String },
      price: { type: String },
      color: { type: String }
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);