const router = require('express').Router();
const Article = require('../models/Article');
const auth = require('../middleware/auth');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 120);
}

// Public: list published articles
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    const articles = await Article.find(filter)
      .sort({ publishedAt: -1 })
      .select('-content');
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: single article by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({
      slug: req.params.slug,
      published: true,
    });
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list ALL articles (including drafts)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const articles = await Article.find()
      .sort({ updatedAt: -1 })
      .select('-content');
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get single article by id (for editing)
router.get('/admin/:id', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: create
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, coverImage, published } =
      req.body;
    let slug = slugify(title);
    const existing = await Article.findOne({ slug });
    if (existing) slug += '-' + Date.now().toString(36);

    const article = await Article.create({
      title,
      slug,
      content,
      excerpt,
      category: category || 'blog',
      tags: tags || [],
      coverImage: coverImage || '',
      published: !!published,
      publishedAt: published ? new Date() : null,
    });
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update
router.put('/:id', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });

    const fields = [
      'title',
      'content',
      'excerpt',
      'category',
      'tags',
      'coverImage',
      'published',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) article[f] = req.body[f];
    });

    if (req.body.title) {
      let slug = slugify(req.body.title);
      const dup = await Article.findOne({ slug, _id: { $ne: article._id } });
      if (dup) slug += '-' + Date.now().toString(36);
      article.slug = slug;
    }

    await article.save();
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
