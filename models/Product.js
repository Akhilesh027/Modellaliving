const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String },
  description: String,
  price: { type: Number },
  category: String,
  stock: { type: Number, default: 0 },
  color: String,
  images: [String], // array of image file names or URLs
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);
