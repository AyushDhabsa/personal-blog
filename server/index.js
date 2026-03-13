require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Admin = require('./models/Admin');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
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

    // Ensure admin account exists and matches environment variables (create or update)
    try {
      const envEmail = process.env.ADMIN_EMAIL || 'ayushdhabsa8@gmail.com';
      const envPassword = process.env.ADMIN_PASSWORD || 'Fjik4.62/,';

      // Find any admin account
      let admin = await Admin.findOne({});

      if (!admin) {
        await Admin.create({ email: envEmail, password: envPassword });
        console.log('Admin account created');
      } else {
        let changed = false;
        if (admin.email !== envEmail) {
          admin.email = envEmail;
          changed = true;
        }
        const pwMatches = await admin.comparePassword(envPassword);
        if (!pwMatches) {
          admin.password = envPassword; // pre-save hook will hash
          changed = true;
        }
        if (changed) {
          await admin.save();
          console.log('Admin account updated to match environment variables');
        } else {
          console.log('Admin account present and matches environment variables');
        }
      }
    } catch (err) {
      console.error('Error ensuring admin account:', err);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));
