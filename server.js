const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Product = require('./models/Product.js'); // Product model file
const User = require('./models/User.js'); // Product model file
const Wishlist = require('./models/Wishlist.js'); // Product model file
const Cart = require('./models/Cart.js'); // Product model file
require('dotenv').config(); // Optional: For using environment variables
const bcrypt = require('bcryptjs');
const Order = require('./models/Order.js');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5500;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://akhileshreddy811:F5fmCE2e6oSCZ3iX@cluster0.ekaqort.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // make sure this folder exists or create it
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

app.post('/api/products', upload.array('images', 15), async (req, res) => {
  try {
    const { name, sku, description, price, category, stock, color } = req.body;
    const images = req.files.map(file => file.filename); // or save file.path for URL

    const product = new Product({
      name,
      sku,
      description,
      price,
      category,
      stock,
      color,
      images,
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error adding product', error: error.message });
  }
});

// PUT /api/products/:id (edit product, with optional image upload)
app.put('/api/admin/products/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, category, stock, color } = req.body;
    const images = req.files.length > 0 ? req.files.map(file => file.filename) : undefined;

    const updateData = { name, description, price, category, stock, color };
    if (images) updateData.images = images;

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    // Validate required fields
    if (!name || !email || !password || !mobile) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists by email or mobile
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or mobile already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      mobile,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
    console.log("User registered");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Login Route
app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
app.get('/api/order/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching orders', error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials (email not found)' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials (wrong password)' });
    }

    // Optional: Generate JWT here

    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,        // ✅ Include this
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});


// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// POST /api/wishlist/add
app.post('/api/wishlist/add', async (req, res) => {
  const { userId, productId } = req.body;

  try {
    // Validate input
    if (!userId || !productId) {
      return res.status(400).json({ message: "Missing userId or productId" });
    }

    // Find the product
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId });

    // Prepare item to be added
    const itemData = {
      productId: product._id,
      name: product.name,
      images: product.images, // ✅ Full image array
      sku: product.sku,
      stock: product.stock,
      price: product.price,
      color: product.color
    };

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [itemData] });
    } else {
      const alreadyExists = wishlist.items.some(item => item.productId.toString() === productId);
      if (alreadyExists) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }
      wishlist.items.push(itemData);
    }

    await wishlist.save();
    res.status(200).json({ message: "Product added to wishlist", wishlist });

  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});


// Add product to cart
app.post('/api/cart/add', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: 'Missing userId or productId' });
    }

    // Fetch product details
    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Find user's cart or create one
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    // Check if product already in cart
    const existingProductIndex = cart.products.findIndex(p => p.productId.toString() === productId);

    if (existingProductIndex > -1) {
      // Update quantity
      cart.products[existingProductIndex].quantity += quantity;
    } else {
      // Add new product with details
      cart.products.push({
        productId: product._id,
        name: product.name,
        images: product.images, // ✅ store full array of images
        sku: product.sku,
        stock: product.stock,
        quantity: quantity,
        price: product.price,
        color: product.color,
      });
    }

    await cart.save();

    res.json({ message: 'Product added to cart successfully', cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/wishlist/:userId', async (req, res) => {
  try {
    const cart = await Wishlist.findOne({ userId: req.params.userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/api/cart/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});
app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId,           // ✅ Get userId from request body
      fullName,
      email,
      phone,
      address,
      state,
      pincode,
      paymentMethod,
      subtotal,
      shipping,
      total,
      products,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const newOrder = new Order({
      userId,           // ✅ Save userId
      fullName,
      email,
      phone,
      address,
      state,
      pincode,
      paymentMethod,
      subtotal,
      shipping,
      total,
      products,
    });

    await newOrder.save();
    res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ message: 'Failed to place order' });
  }
});

// PUT /api/cart/update-quantity/:userId
app.put('/api/cart/update-quantity/:userId', async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const product = cart.products.find(p => p.productId === productId);
    if (!product) return res.status(404).json({ message: 'Product not in cart' });

    product.quantity = quantity;
    cart.markModified('products');
    await cart.save();

    res.json({ message: 'Quantity updated successfully', cart });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// routes/cart.js or appropriate controller
// DELETE /api/cart/remove-item/:userId/:productId
app.delete('/api/cart/remove-item/:userId/:productId', async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.products = cart.products.filter(p => p.productId !== productId);
    await cart.save();

    res.json({ message: 'Item removed successfully', cart });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/cart/item/:cartId', async (req, res) => {
  const { cartId } = req.params;

  try {
    // Find cart by ID and populate all products' productId details
    const cart = await Cart.findById(cartId).populate('products.productId');

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Return the whole cart with products populated
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error while fetching cart' });
  }
});

// DELETE /api/wishlist/:userId/remove/:productId
app.delete('/api/wishlist/remove/:userId/:productId', async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Ensure correct comparison by converting both to string
    wishlist.items = wishlist.items.filter(
      item => String(item.productId) !== String(productId)
    );

    await wishlist.save();

    res.json({ message: 'Item removed from wishlist', wishlist });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Failed to remove item from wishlist' });
  }
});
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments(); // filter for users only

    res.json({
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue,
      totalProducts,
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // latest first
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});
app.patch('/api/admin/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!['pending', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // exclude password
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('API Running...');
});