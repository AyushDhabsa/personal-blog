const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, required: true },
  category: { type: String, enum: ['blog', 'research'], default: 'blog' },
  tags: [String],
  coverImage: { type: String, default: '' },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
}, { timestamps: true });

articleSchema.pre('save', function () {
  if (this.isModified('published') && this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

module.exports = mongoose.model('Article', articleSchema);
