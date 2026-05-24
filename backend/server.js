const express = require('express');
const Valkey = require('ioredis');
const cors = require('cors');
const { v7: uuidv7 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connect to Valkey Bundle running in Docker
const valkey = new Valkey({
  host: process.env.VALKEY_HOST || '127.0.0.1',
  port: parseInt(process.env.VALKEY_PORT) || 6379,
});

valkey.on('connect', () => {
  console.log('🚀 Successfully connected to the Valkey Bundle!');
});

valkey.on('error', (err) => {
  console.error('❌ Valkey connection error:', err);
});

// 2. Initialize the Local AI Embedding Pipeline
let embedder = null;
async function initAI() {
  try {
    const { pipeline } = require('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("🤖 Sentence Transformer Model (all-MiniLM-L6-v2) Loaded Successfully!");
  } catch (err) {
    console.warn("⚠️ Warning: Could not load Xenova Transformers. Vector search will use fallback embeddings.", err.message);
  }
  await createVectorIndex();
}

// Helper to generate embedding with a deterministic fallback
async function getEmbedding(text) {
  if (embedder) {
    try {
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (err) {
      console.error("Embedding generation failed, falling back:", err);
    }
  }

  // Fallback: Return a deterministic normalized vector derived from the input text
  console.log(`ℹ️ Generating fallback embedding for query: "${text}"`);
  const vector = new Array(384).fill(0);
  for (let i = 0; i < text.length && i < 384; i++) {
    vector[i] = text.charCodeAt(i) / 256.0;
  }
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(v => v / magnitude);
}

// Helper to convert float array to binary Buffer for Valkey
function float32Buffer(arr) {
  return Buffer.from(new Float32Array(arr).buffer);
}

// 3. Create the Valkey JSON Search Index
async function createVectorIndex() {
  try {
    // Drop index if it already exists to ensure updated schema
    try {
      await valkey.call('FT.DROPINDEX', 'idx:products');
      console.log("🧹 Dropped existing index idx:products to refresh schema.");
    } catch (e) {
      // Index did not exist, which is fine
    }

    // Create the index
    await valkey.call('FT.CREATE', 'idx:products',
      'ON', 'JSON',
      'PREFIX', '1', 'product:',
      'SCHEMA',
      '$.name', 'AS', 'name', 'TAG',
      '$.brand', 'AS', 'brand', 'TAG',
      '$.categoryName', 'AS', 'categoryName', 'TAG',
      '$.price.amount', 'AS', 'price', 'NUMERIC',
      '$.ratings.average', 'AS', 'rating', 'NUMERIC',
      '$.embedding', 'AS', 'embedding', 'VECTOR', 'HNSW', '6',
        'TYPE', 'FLOAT32',
        'DIM', '384',
        'DISTANCE_METRIC', 'COSINE'
    );
    console.log("✅ Valkey Vector Index 'idx:products' created successfully!");
  } catch (err) {
    console.error("❌ Error creating index:", err);
  }
}

// 4. Sample Products Dataset
const sampleProducts = [
  {
    id: "product:0192d4e6-2c4e-7a6b-8d8f-0a1b2c3d4e5f",
    sku: "ELEC-PHN-SAM-001",
    name: "Galaxy Ultra Pro 5G",
    slug: "galaxy-ultra-pro",
    description: "Flagship 5G smartphone with 200MP camera, 6.8 inch AMOLED display, 12GB RAM, and 5000mAh battery for all-day performance.",
    shortDescription: "200MP camera, 6.8\" AMOLED, 5000mAh",
    categoryId: "category:0192d4e2-3a7b-7e1f-8c4d-2b6a9f0e5d7c",
    categoryName: "Mobile & Accessories",
    brand: "Samsung",
    price: { amount: 89999, currency: "INR", compareAt: 99999 },
    image: "assets/images/thumbs/product-two-img1.png",
    ratings: { average: 4.8, count: 2341 }
  },
  {
    id: "product:0192d4e6-3d5f-7b8c-9e0a-1b2c3d4e5f6a",
    sku: "ELEC-LAP-DEL-002",
    name: "Dell XPS 15 Laptop",
    slug: "dell-xps-15",
    description: "Premium developer laptop with 15.6 inch OLED touch screen, Intel Core i9 processor, 32GB RAM, and 1TB SSD storage.",
    shortDescription: "Intel i9, 32GB RAM, 1TB SSD",
    categoryId: "category:0192d4e2-4c8d-7a2e-9f1b-3d5c7e8a0b4f",
    categoryName: "Laptop",
    brand: "Dell",
    price: { amount: 149999, currency: "INR", compareAt: 169999 },
    image: "assets/images/thumbs/product-two-img2.png",
    ratings: { average: 4.7, count: 1205 }
  },
  {
    id: "product:0192d4e6-4e6a-7b9d-8c1b-2b3c4d5e6f7a",
    sku: "ELEC-AUD-SON-003",
    name: "Sony WH-1000XM5 Headphones",
    slug: "sony-wh-1000xm5",
    description: "Industry-leading wireless active noise-cancelling over-ear headphones with 30-hour battery life, touch controls, and high-res audio.",
    shortDescription: "Active Noise Cancelling, 30h battery",
    categoryId: "category:0192d4e2-6eaf-7c4a-9b3d-5f7e2a0c1d6b",
    categoryName: "Headphone",
    brand: "Sony",
    price: { amount: 29999, currency: "INR", compareAt: 34999 },
    image: "assets/images/thumbs/product-two-img3.png",
    ratings: { average: 4.9, count: 852 }
  },
  {
    id: "product:0192d4e6-5f7b-7c0e-9d2c-3c4d5e6f7a8b",
    sku: "SPRT-FIT-APL-004",
    name: "Apple Watch Series 9",
    slug: "apple-watch-s9",
    description: "Smart fitness watch with ECG, crash detection, blood oxygen monitoring, always-on Retina display, and sports tracking apps.",
    shortDescription: "ECG, Blood Oxygen, Sports Tracking",
    categoryId: "category:0192d4e2-5d9e-7b3f-8a2c-4e6d1f9b0c5a",
    categoryName: "Smart Watch",
    brand: "Apple",
    price: { amount: 41900, currency: "INR", compareAt: 45900 },
    image: "assets/images/thumbs/product-two-img4.png",
    ratings: { average: 4.6, count: 1423 }
  },
  {
    id: "product:0192d4e6-6a8c-7d1f-8e3d-4c5d6e7f8a9b",
    sku: "ELEC-STO-SAN-005",
    name: "SanDisk Portable SSD 1TB",
    slug: "sandisk-ssd-1tb",
    description: "High-speed external solid-state drive with up to 1050MB/s read speeds, USB-C 3.2 Gen 2, drop-resistant, water and dust resistant.",
    shortDescription: "1TB external SSD, USB-C, IP55",
    categoryId: "category:0192d4e2-7eaf-8c5b-9d4e-5f6a7b8c9d0e",
    categoryName: "Storage",
    brand: "SanDisk",
    price: { amount: 8999, currency: "INR", compareAt: 12999 },
    image: "assets/images/thumbs/product-two-img5.png",
    ratings: { average: 4.5, count: 320 }
  },
  {
    id: "product:0192d4e6-7b9d-7e2f-9f4e-5c6d7e8f9a0b",
    sku: "FASH-TEE-NKE-006",
    name: "Nike Dri-FIT Sports Tee",
    slug: "nike-dri-fit-tee",
    description: "Comfortable organic cotton-poly blend athletic shirt with sweat-wicking technology for morning jogs and high-intensity workouts.",
    shortDescription: "Sweat-wicking athletic workout tee",
    categoryId: "category:0192d4e3-8c2d-7e5f-9b3a-0d4c6e7f1a2b",
    categoryName: "Fashion",
    brand: "Nike",
    price: { amount: 1999, currency: "INR", compareAt: 2499 },
    image: "assets/images/thumbs/product-two-img6.png",
    ratings: { average: 4.4, count: 180 }
  },
  {
    id: "product:0192d4e6-8c0e-7f3f-8a5f-6d7e8f9a0b1c",
    sku: "HOME-CHR-ERG-007",
    name: "Ergonomic Mesh Office Chair",
    slug: "ergonomic-mesh-chair",
    description: "High-back office desk chair with breathable mesh, 3D armrests, adjustable lumbar support, and tilt lock mechanism for back pain relief.",
    shortDescription: "Ergonomic high-back mesh desk chair",
    categoryId: "category:0192d4e4-2b3c-7d4e-9f5a-6b7c8d9e0f1a",
    categoryName: "Home & Kitchen",
    brand: "ErgoComfort",
    price: { amount: 12499, currency: "INR", compareAt: 15999 },
    image: "assets/images/thumbs/product-two-img7.png",
    ratings: { average: 4.7, count: 540 }
  },
  {
    id: "product:0192d4e6-9d1f-8a0a-9b6f-7d8e9f0a1b2c",
    sku: "SPRT-BOT-HYD-008",
    name: "Hydro Flask Insulated Bottle",
    slug: "hydro-flask-bottle",
    description: "Double-wall vacuum insulated stainless steel water bottle, 32 oz, keeps sports drinks cold for 24 hours or hot for 12 hours.",
    shortDescription: "32oz vacuum insulated sports bottle",
    categoryId: "category:0192d4e5-6f7a-7b8c-9d9e-0f1a2b3c4d5e",
    categoryName: "Sports & Outdoors",
    brand: "Hydro Flask",
    price: { amount: 3499, currency: "INR", compareAt: 3999 },
    image: "assets/images/thumbs/product-two-img8.png",
    ratings: { average: 4.8, count: 915 }
  }
];

// Helper to parse FT.SEARCH outputs into clean JSON objects
function parseSearchResults(rawResults) {
  const total = rawResults[0];
  const results = [];
  for (let i = 1; i < rawResults.length; i += 2) {
    const docId = rawResults[i];
    const fieldsArray = rawResults[i + 1];
    
    const fields = {};
    for (let j = 0; j < fieldsArray.length; j += 2) {
      fields[fieldsArray[j]] = fieldsArray[j + 1];
    }
    
    let productData = {};
    if (fields['$']) {
      try {
        productData = JSON.parse(fields['$']);
      } catch (e) {
        console.error("Error parsing JSON field for doc:", docId, e);
      }
    }
    
    const score = fields['score'] ? parseFloat(fields['score']) : null;
    
    // Strip vector from output payload to keep transfer sizes light
    if (productData.embedding) delete productData.embedding;
    
    results.push({
      id: docId,
      score,
      ...productData
    });
  }
  return { total, results };
}

// 5. API Routes

// Test connectivity
app.get('/api/ping', async (req, res) => {
  try {
    const status = await valkey.ping();
    res.json({ message: "Valkey bundle is active!", status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sample Coupons Dataset
const sampleCoupons = [
  {
    code: "VALKEY10",
    type: "percentage",
    value: 10,
    minOrderAmount: 5000, // $50.00
    active: true
  },
  {
    code: "WELCOME500",
    type: "fixed",
    value: 500, // $5.00
    minOrderAmount: 2000, // $20.00
    active: true
  }
];

// Seed Endpoint (inserts database schema, seed products and coupons)
app.post('/api/seed', async (req, res) => {
  try {
    console.log("🌱 Seeding database products and coupons...");
    // Seed products
    for (const item of sampleProducts) {
      const textToEmbed = `${item.name}. ${item.description}`;
      const embedding = await getEmbedding(textToEmbed);
      const productDoc = {
        ...item,
        embedding
      };
      await valkey.call('JSON.SET', item.id, '$', JSON.stringify(productDoc));
    }
    
    // Seed coupons
    for (const coupon of sampleCoupons) {
      await valkey.call('JSON.SET', `coupon:${coupon.code}`, '$', JSON.stringify(coupon));
    }

    res.json({ message: `Successfully seeded ${sampleProducts.length} products and ${sampleCoupons.length} coupons into Valkey!` });
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rate Limiter Middleware
async function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `ratelimit:${ip}`;
  try {
    const count = await valkey.incr(key);
    if (count === 1) {
      await valkey.expire(key, 60); // 60 seconds sliding window
    }
    if (count > 100) { // Limit 100 requests per minute
      return res.status(429).json({ error: "Too many requests. Rate limit exceeded (100 req/min)." });
    }
    
    // Increment total requests processed metric (Prometheus)
    await valkey.incr('metrics:requests:total');
    // Track unique active user IP (HyperLogLog)
    await valkey.pfadd('metrics:active_users:24h', ip);

    next();
  } catch (err) {
    console.error("Rate limiter error:", err);
    next();
  }
}
app.use('/api', rateLimiter);

// Helper to fetch all JSON products using SCAN
async function getAllProducts() {
  let cursor = '0';
  let keys = [];
  do {
    const reply = await valkey.scan(cursor, 'MATCH', 'product:*', 'COUNT', '100');
    cursor = reply[0];
    keys.push(...reply[1]);
  } while (cursor !== '0');

  if (keys.length === 0) return [];

  const products = [];
  for (const key of keys) {
    const jsonStr = await valkey.call('JSON.GET', key, '$');
    if (jsonStr) {
      const item = JSON.parse(jsonStr)[0];
      if (item.embedding) delete item.embedding;
      products.push(item);
    }
  }
  return products;
}

// List all products (using SCAN helper)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Semantic Vector Similarity Search + Full Text Query
app.get('/api/search', async (req, res) => {
  const { q, category } = req.query;
  if (!q) {
    // If no query, return list of all products (filtered by category if present)
    try {
      const products = await getAllProducts();
      if (category && category !== "All Categories") {
        return res.json(products.filter(p => p.categoryName === category));
      }
      return res.json(products);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    // 1. Generate search vector
    const queryVector = await getEmbedding(q);
    const queryVectorBuffer = float32Buffer(queryVector);

    // 2. Perform KNN Hybrid search
    // If category is provided, construct hybrid search filter: (@categoryName:{Category})=>[KNN 10 @embedding $query_vec AS score]
    let queryFilter = "*";
    if (category && category !== "All Categories") {
      queryFilter = `(@categoryName:{${category}})`;
    }

    const searchQuery = `${queryFilter}=>[KNN 10 @embedding $query_vec AS score]`;

    const rawResults = await valkey.call(
      'FT.SEARCH', 'idx:products',
      searchQuery,
      'PARAMS', '2', 'query_vec', queryVectorBuffer,
      'DIALECT', '2'
    );

    const parsed = parseSearchResults(rawResults);
    res.json(parsed.results);
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Record product view event (Sorted Sets)
app.post('/api/events/view', async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "productId is required" });

  try {
    // Increment view score by 1 in global trending ZSET
    const score = await valkey.zincrby('trending:global:24h', 1, productId);
    res.json({ success: true, productId, score: parseFloat(score) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Trending Products
app.get('/api/trending', async (req, res) => {
  try {
    // Get top 5 product IDs sorted by score in descending order
    const trendingIds = await valkey.zrevrange('trending:global:24h', 0, 4);
    
    if (trendingIds.length === 0) {
      // Fallback: If no trending events yet, return first 5 products
      const products = await getAllProducts();
      return res.json(products.slice(0, 5));
    }

    // Retrieve details for each trending product
    const trendingProducts = [];
    for (const id of trendingIds) {
      const jsonStr = await valkey.call('JSON.GET', id, '$');
      if (jsonStr) {
        const item = JSON.parse(jsonStr)[0];
        if (item.embedding) delete item.embedding;
        trendingProducts.push(item);
      }
    }
    res.json(trendingProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Shopping Cart with Coupons calculations (Valkey Hashes & JSON)
app.get('/api/cart', async (req, res) => {
  const userId = req.query.userId || 'guest_user';
  try {
    const cartItems = await valkey.hgetall(`cart:${userId}`);
    const cart = [];
    let subtotal = 0;

    for (const [productId, quantityStr] of Object.entries(cartItems)) {
      const quantity = parseInt(quantityStr);
      const jsonStr = await valkey.call('JSON.GET', productId, '$');
      if (jsonStr) {
        const item = JSON.parse(jsonStr)[0];
        if (item.embedding) delete item.embedding;
        cart.push({
          product: item,
          quantity
        });
        subtotal += (item.price?.amount || 0) * quantity;
      }
    }

    // Check if coupon is applied
    const appliedCouponCode = await valkey.get(`cart:${userId}:coupon`);
    let discount = 0;
    let couponDetails = null;
    let couponMessage = "";

    if (appliedCouponCode) {
      const couponStr = await valkey.call('JSON.GET', `coupon:${appliedCouponCode}`, '$');
      if (couponStr) {
        const coupon = JSON.parse(couponStr)[0];
        couponDetails = coupon;
        if (subtotal >= coupon.minOrderAmount) {
          if (coupon.type === 'percentage') {
            discount = Math.round((subtotal * coupon.value) / 100);
          } else if (coupon.type === 'fixed') {
            discount = coupon.value;
          }
          couponMessage = `Coupon ${appliedCouponCode} applied successfully! Discount: $${(discount / 100).toFixed(2)}`;
        } else {
          couponMessage = `Coupon applied but requires a minimum purchase of $${(coupon.minOrderAmount / 100).toFixed(2)}`;
        }
      }
    }

    const tax = Math.round((subtotal - discount) * 0.08); // 8% estimated tax
    const total = Math.max(0, subtotal - discount + tax);

    res.json({
      items: cart,
      subtotal,
      discount,
      tax,
      total,
      appliedCoupon: appliedCouponCode,
      couponDetails,
      couponMessage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Item to Cart (Valkey HSET)
app.post('/api/cart/items', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  const uId = userId || 'guest_user';
  if (!productId || quantity === undefined) return res.status(400).json({ error: "productId and quantity are required" });

  try {
    await valkey.hset(`cart:${uId}`, productId, quantity);
    await valkey.expire(`cart:${uId}`, 604800); // Expire cart after 7 days of inactivity
    res.json({ success: true, productId, quantity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Item from Cart (Valkey HDEL)
app.delete('/api/cart/items/:productId', async (req, res) => {
  const userId = req.query.userId || 'guest_user';
  const { productId } = req.params;
  try {
    await valkey.hdel(`cart:${userId}`, productId);
    res.json({ success: true, message: "Item removed from cart" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Cart (Valkey DEL)
app.delete('/api/cart', async (req, res) => {
  const userId = req.query.userId || 'guest_user';
  try {
    await valkey.del(`cart:${userId}`);
    await valkey.del(`cart:${userId}:coupon`);
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply Coupon (Valkey Strings with TTL)
app.post('/api/cart/coupon', async (req, res) => {
  const { userId, couponCode } = req.body;
  const uId = userId || 'guest_user';
  if (!couponCode) return res.status(400).json({ error: "couponCode is required" });

  try {
    const couponStr = await valkey.call('JSON.GET', `coupon:${couponCode.toUpperCase().trim()}`, '$');
    if (!couponStr) {
      return res.status(400).json({ error: "Invalid coupon code" });
    }
    const coupon = JSON.parse(couponStr)[0];
    if (!coupon.active) {
      return res.status(400).json({ error: "This coupon is currently inactive" });
    }

    // Save coupon for user cart session (expires in 7 days matching cart TTL)
    const key = `cart:${uId}:coupon`;
    await valkey.set(key, coupon.code, 'EX', 604800);
    res.json({ success: true, message: `Coupon ${coupon.code} applied successfully!`, coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove Coupon
app.delete('/api/cart/coupon', async (req, res) => {
  const userId = req.query.userId || 'guest_user';
  try {
    await valkey.del(`cart:${userId}:coupon`);
    res.json({ success: true, message: "Coupon removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prometheus Metrics endpoint (/metrics)
app.get('/metrics', async (req, res) => {
  try {
    const totalRequests = await valkey.get('metrics:requests:total') || '0';
    const activeUsers = await valkey.pfcount('metrics:active_users:24h') || 0;
    const trendingProductsCount = await valkey.zcard('trending:global:24h') || 0;

    res.set('Content-Type', 'text/plain');
    res.send(`# HELP valkey_ecommerce_requests_total Total HTTP Requests processed by API
# TYPE valkey_ecommerce_requests_total counter
valkey_ecommerce_requests_total ${totalRequests}

# HELP valkey_ecommerce_active_users_24h Estimated unique active users in the last 24 hours (HLL)
# TYPE valkey_ecommerce_active_users_24h gauge
valkey_ecommerce_active_users_24h ${activeUsers}

# HELP valkey_ecommerce_trending_products_count Number of unique products tracked in popularity list (ZSET)
# TYPE valkey_ecommerce_trending_products_count gauge
valkey_ecommerce_trending_products_count ${trendingProductsCount}
`);
  } catch (err) {
    res.status(500).send(`# ERROR: ${err.message}`);
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Semantic Backend Server listening on port ${PORT}`);
  initAI();
});
