require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Admin = require('./models/Admin');

const app = express();

// Robust CORS configuration:
// - If CLIENT_URL is set to '*' we reflect the incoming Origin header (so credentials can be allowed).
// - Otherwise we restrict to the provided CLIENT_URL value.
const corsOptions = {
  origin: process.env.CLIENT_URL === '*' ? true : (process.env.CLIENT_URL || true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));

// Image upload
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

app.post(
  '/api/upload',
  require('./middleware/auth'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  }
);

// Start server first, then connect to MongoDB
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // Ensure admin account exists (use provided env vars or safe defaults)
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ayushdhabsa8@gmail.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Fjik4.62/,'; 

    let admin = await Admin.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      await Admin.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      console.log('Admin account created:', ADMIN_EMAIL);
    } else {
      // If admin exists but password environment variable is provided, update password
      if (process.env.ADMIN_PASSWORD) {
        admin.password = ADMIN_PASSWORD;
        await admin.save();
        console.log('Admin password updated for', ADMIN_EMAIL);
      }
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));
