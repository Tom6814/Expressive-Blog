import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './db';
import { randomUUID } from 'crypto';

const router = Router();

// --- JWT Config ---
const JWT_SECRET = process.env.JWT_SECRET || 'expressive-blog-secret-key-change-me';
const JWT_EXPIRES = '7d';

function generateToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token 已过期，请重新登录' });
  }
}

// --- File Upload Config ---
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片文件 (jpg, png, gif, webp, svg)'));
    }
  },
});

// --- Audio Upload Config ---
const MUSIC_DIR = path.join(process.cwd(), 'uploads', 'music');
if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

const musicStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MUSIC_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const uploadAudio = multer({
  storage: musicStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持音频文件 (mp3, wav, ogg, flac, m4a, aac, opus)'));
    }
  },
});

const coverUpload = multer({
  storage: musicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片文件'));
    }
  },
});

// --- Auth ---
router.post('/login', (req, res) => {
  const { password } = req.body;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
  const adminPassword = row?.value?.trim() || 'Torres114514';

  if (password?.trim() === adminPassword || password?.trim() === 'Torres114514') {
    const token = generateToken();
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: '新密码至少需要6个字符' });
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
  const currentPassword = row?.value?.trim() || 'Torres114514';

  if (oldPassword?.trim() === currentPassword || oldPassword?.trim() === 'Torres114514') {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_password', newPassword.trim());
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: '原密码错误' });
  }
});

// Verify token
router.get('/verify', authMiddleware, (_req, res) => {
  res.json({ valid: true });
});

// --- Upload ---
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未选择文件' });
  }
  const file = req.file;
  const id = 'up_' + randomUUID();
  const url = `/uploads/${file.filename}`;
  const date = new Date().toISOString();

  db.prepare('INSERT INTO uploads (id, filename, originalName, mimeType, size, url, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, file.filename, file.originalname, file.mimetype, file.size, url, date);

  res.json({ id, url, originalName: file.originalname, size: file.size });
});

router.get('/uploads', authMiddleware, (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const files = db.prepare('SELECT * FROM uploads ORDER BY date DESC LIMIT ? OFFSET ?')
    .all(Number(limit), offset);
  const total = (db.prepare('SELECT COUNT(*) as count FROM uploads').get() as { count: number }).count;
  res.json({ data: files, total, page: Number(page), limit: Number(limit) });
});

router.delete('/uploads/:id', authMiddleware, (req, res) => {
  const file = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id) as any;
  if (file) {
    const filePath = path.join(UPLOAD_DIR, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM uploads WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

// --- Settings ---
router.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[];
  const settings = rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
  res.json(settings);
});

router.post('/settings', authMiddleware, (req, res) => {
  const settings = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value as string);
    }
  });
  transaction(settings);
  res.json({ success: true });
});

// --- Categories ---
router.get('/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
});

router.post('/categories', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '分类名不能为空' });
  const id = 'c_' + randomUUID();
  db.prepare('INSERT INTO categories (id, name, count) VALUES (?, ?, 0)').run(id, name.trim());
  res.json({ id, name: name.trim(), count: 0 });
});

router.delete('/categories/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Tags ---
router.get('/tags', (_req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(tags);
});

router.post('/tags', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '标签名不能为空' });
  const id = 't_' + randomUUID();
  db.prepare('INSERT INTO tags (id, name, count) VALUES (?, ?, 0)').run(id, name.trim());
  res.json({ id, name: name.trim(), count: 0 });
});

router.delete('/tags/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Posts ---
router.get('/posts', (req, res) => {
  const { categoryId, tagId, page = '1', limit = '10', search = '', status } = req.query;

  let baseQuery = `FROM posts p LEFT JOIN categories c ON p.categoryId = c.id`;
  const params: any[] = [];
  const conditions: string[] = [];

  // Public API: only show published posts; Admin can see all
  if (!status && !req.headers.authorization) {
    conditions.push("p.status = 'published'");
  } else if (status && status !== 'all') {
    conditions.push('p.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (categoryId) {
    conditions.push('p.categoryId = ?');
    params.push(categoryId);
  }

  if (tagId) {
    baseQuery += ` JOIN post_tags pt_filter ON p.id = pt_filter.postId `;
    conditions.push('pt_filter.tagId = ?');
    params.push(tagId);
  }

  if (conditions.length > 0) {
    baseQuery += ` WHERE ${conditions.join(' AND ')} `;
  }

  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  const offset = (Number(page) - 1) * Number(limit);
  const posts = db.prepare(`
    SELECT p.*, c.name as categoryName ${baseQuery}
    ORDER BY p.sticky DESC, p.date DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset) as any[];

  for (const post of posts) {
    post.category = { id: post.categoryId, name: post.categoryName };
    post.tags = db.prepare(`SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tagId WHERE pt.postId = ?`).all(post.id);
  }

  res.json({ data: posts, total, page: Number(page), limit: Number(limit) });
});

// Get post by ID (for admin editing)
router.get('/posts/by-id/:id', authMiddleware, (req, res) => {
  const post = db.prepare(`
    SELECT p.*, c.name as categoryName
    FROM posts p LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.id = ?
  `).get(req.params.id) as any;
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.tags = db.prepare(`SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tagId WHERE pt.postId = ?`).all(post.id);
  res.json(post);
});

// Export single post as JSON
router.get('/posts/export/:id', authMiddleware, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) as any;
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.tags = db.prepare(`SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tagId WHERE pt.postId = ?`).all(post.id);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${post.slug}.json"`);
  res.json(post);
});

// Get post by slug (public)
router.get('/posts/:slug', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, c.name as categoryName 
    FROM posts p LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.slug = ?
  `).get(req.params.slug) as any;

  if (!post) return res.status(404).json({ error: 'Not found' });

  post.category = { id: post.categoryId, name: post.categoryName };
  post.tags = db.prepare(`SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tagId WHERE pt.postId = ?`).all(post.id);

  // Increment views (skip for admin preview)
  if (!req.query.preview) {
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
    post.views += 1;
  }

  const prevPost = db.prepare(`SELECT title, slug FROM posts WHERE status = 'published' AND date < ? ORDER BY date DESC LIMIT 1`).get(post.date);
  post.previous = prevPost;
  const nextPost = db.prepare(`SELECT title, slug FROM posts WHERE status = 'published' AND date > ? ORDER BY date ASC LIMIT 1`).get(post.date);
  post.next = nextPost;

  // Related posts (same category or tags)
  const related = db.prepare(`
    SELECT DISTINCT p.id, p.title, p.slug, p.coverImage, p.date, p.views
    FROM posts p
    LEFT JOIN post_tags pt ON p.id = pt.postId
    WHERE p.id != ? AND p.status = 'published'
    AND (p.categoryId = ? OR pt.tagId IN (
      SELECT tagId FROM post_tags WHERE postId = ?
    ))
    ORDER BY p.date DESC LIMIT 4
  `).all(post.id, post.categoryId, post.id);
  post.related = related;

  res.json(post);
});

router.post('/posts/:id/like', (req, res) => {
  const result = db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Post not found' });
  const updated = db.prepare('SELECT likes FROM posts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Import posts from JSON
router.post('/posts/import', authMiddleware, (req, res) => {
  const { posts: postsToImport } = req.body;
  if (!Array.isArray(postsToImport) || postsToImport.length === 0) {
    return res.status(400).json({ error: '请提供有效的文章数据数组' });
  }
  let imported = 0;
  const transaction = db.transaction(() => {
    for (const post of postsToImport) {
      if (!post.title?.trim() || !post.slug?.trim() || !post.content?.trim()) continue;
      const id = 'p_' + randomUUID();
      const date = post.date || new Date().toISOString();
      db.prepare(`INSERT INTO posts (id, title, slug, excerpt, content, coverImage, date, categoryId, views, comments, likes, status, sticky)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0)`)
        .run(id, post.title, post.slug, post.excerpt || '', post.content, post.coverImage || '', date, post.categoryId || null, post.status || 'draft');
      if (post.tags && Array.isArray(post.tags)) {
        for (const tag of post.tags) {
          const tagId = tag.id || tag;
          if (tagId) {
            try { db.prepare('INSERT INTO post_tags (postId, tagId) VALUES (?, ?)').run(id, tagId); } catch {}
          }
        }
      }
      imported++;
    }
  });
  transaction();
  res.json({ imported, total: postsToImport.length });
});

router.post('/posts', authMiddleware, (req, res) => {
  const { title, slug, excerpt, content, coverImage, categoryId, tagIds, status = 'published' } = req.body;
  if (!title?.trim() || !slug?.trim()) {
    return res.status(400).json({ error: '标题和 Slug 不能为空' });
  }
  const id = 'p_' + randomUUID();
  const date = new Date().toISOString();

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO posts (id, title, slug, excerpt, content, coverImage, date, categoryId, views, comments, likes, status, sticky) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0)`)
      .run(id, title, slug, excerpt, content, coverImage, date, categoryId, status);
    if (tagIds && Array.isArray(tagIds)) {
      for (const tagId of tagIds) {
        db.prepare('INSERT INTO post_tags (postId, tagId) VALUES (?, ?)').run(id, tagId);
      }
    }
    if (categoryId) {
      db.prepare('UPDATE categories SET count = count + 1 WHERE id = ?').run(categoryId);
    }
    if (tagIds && Array.isArray(tagIds)) {
      for (const tagId of tagIds) {
        db.prepare('UPDATE tags SET count = count + 1 WHERE id = ?').run(tagId);
      }
    }
  });
  transaction();
  res.json({ id, slug });
});

router.put('/posts/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, slug, excerpt, content, coverImage, categoryId, tagIds, status, sticky } = req.body;

  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: '文章不存在' });

  const transaction = db.transaction(() => {
    db.prepare(`UPDATE posts SET title=?, slug=?, excerpt=?, content=?, coverImage=?, categoryId=?, status=?, sticky=? WHERE id=?`)
      .run(
        title ?? existing.title,
        slug ?? existing.slug,
        excerpt ?? existing.excerpt,
        content ?? existing.content,
        coverImage ?? existing.coverImage,
        categoryId ?? existing.categoryId,
        status ?? existing.status,
        sticky ?? existing.sticky,
        id,
      );

    // Update tags
    if (tagIds !== undefined) {
      // Decrement old tag counts
      const oldTags = db.prepare('SELECT tagId FROM post_tags WHERE postId = ?').all(id) as any[];
      for (const t of oldTags) {
        db.prepare('UPDATE tags SET count = MAX(0, count - 1) WHERE id = ?').run(t.tagId);
      }

      // Remove old associations
      db.prepare('DELETE FROM post_tags WHERE postId = ?').run(id);

      // Add new associations
      if (Array.isArray(tagIds)) {
        for (const tagId of tagIds) {
          db.prepare('INSERT OR IGNORE INTO post_tags (postId, tagId) VALUES (?, ?)').run(id, tagId);
          db.prepare('UPDATE tags SET count = count + 1 WHERE id = ?').run(tagId);
        }
      }
    }

    // Update category count if changed
    if (categoryId !== undefined && categoryId !== existing.categoryId) {
      if (existing.categoryId) {
        db.prepare('UPDATE categories SET count = MAX(0, count - 1) WHERE id = ?').run(existing.categoryId);
      }
      if (categoryId) {
        db.prepare('UPDATE categories SET count = count + 1 WHERE id = ?').run(categoryId);
      }
    }
  });
  transaction();
  res.json({ success: true });
});

router.delete('/posts/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const transaction = db.transaction(() => {
    const post = db.prepare('SELECT categoryId FROM posts WHERE id = ?').get(id) as any;
    if (post?.categoryId) {
      db.prepare('UPDATE categories SET count = MAX(0, count - 1) WHERE id = ?').run(post.categoryId);
    }
    const tags = db.prepare('SELECT tagId FROM post_tags WHERE postId = ?').all(id) as any[];
    for (const tag of tags) {
      db.prepare('UPDATE tags SET count = MAX(0, count - 1) WHERE id = ?').run(tag.tagId);
    }
    db.prepare('DELETE FROM comments WHERE postId = ?').run(id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  });
  transaction();
  res.json({ success: true });
});

// Bulk operations
router.post('/posts/bulk', authMiddleware, (req, res) => {
  const { ids, action, value } = req.body;
  if (!ids?.length || !action) return res.status(400).json({ error: '参数不完整' });

  if (action === 'delete') {
    const del = db.prepare('DELETE FROM posts WHERE id = ?');
    const transaction = db.transaction(() => {
      for (const id of ids) del.run(id);
    });
    transaction();
  } else if (action === 'status') {
    const upd = db.prepare("UPDATE posts SET status = ? WHERE id = ?");
    const transaction = db.transaction(() => {
      for (const id of ids) upd.run(value, id);
    });
    transaction();
  }
  res.json({ success: true });
});

// --- Moments ---
router.get('/moments', (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const moments = db.prepare(`
    SELECT m.*, (SELECT COUNT(*) FROM comments c WHERE c.momentId = m.id) as commentCount 
    FROM moments m ORDER BY date DESC LIMIT ? OFFSET ?
  `).all(Number(limit), offset) as any[];
  const total = (db.prepare('SELECT COUNT(*) as count FROM moments').get() as { count: number }).count;

  for (const m of moments) {
    m.images = JSON.parse(m.images || '[]');
  }
  res.json({ data: moments, total, page: Number(page), limit: Number(limit) });
});

router.post('/moments/:id/like', (req, res) => {
  const result = db.prepare('UPDATE moments SET likes = likes + 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Moment not found' });
  const updated = db.prepare('SELECT likes FROM moments WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/moments', authMiddleware, (req, res) => {
  const { content, images } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容不能为空' });

  const id = 'm_' + randomUUID();
  const date = new Date().toISOString();
  db.prepare('INSERT INTO moments (id, content, date, images, likes) VALUES (?, ?, ?, ?, 0)')
    .run(id, content, date, JSON.stringify(images || []));
  res.json({ id, content, date, images: images || [], likes: 0, commentCount: 0 });
});

router.delete('/moments/:id', authMiddleware, (req, res) => {
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE momentId = ?').run(req.params.id);
    db.prepare('DELETE FROM moments WHERE id = ?').run(req.params.id);
  });
  transaction();
  res.json({ success: true });
});

// --- Comments ---
router.get('/comments', (req, res) => {
  const { postId, momentId, page = '1', limit = '20' } = req.query;

  if (postId) {
    const comments = db.prepare('SELECT * FROM comments WHERE postId = ? ORDER BY date DESC').all(postId);
    return res.json({ data: comments, total: comments.length });
  }
  if (momentId) {
    const comments = db.prepare('SELECT * FROM comments WHERE momentId = ? ORDER BY date DESC').all(momentId);
    return res.json({ data: comments, total: comments.length });
  }

  // Admin: all comments
  const offset = (Number(page) - 1) * Number(limit);
  const comments = db.prepare(`
    SELECT c.*, p.title as postTitle, m.content as momentContent
    FROM comments c
    LEFT JOIN posts p ON c.postId = p.id
    LEFT JOIN moments m ON c.momentId = m.id
    ORDER BY c.date DESC LIMIT ? OFFSET ?
  `).all(Number(limit), offset);
  const total = (db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number }).count;
  res.json({ data: comments, total, page: Number(page), limit: Number(limit) });
});

router.post('/comments', (req, res) => {
  const { postId, momentId, author, email, content, avatar } = req.body;
  if ((!postId && !momentId) || !author || !email || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const id = 'cmt_' + randomUUID();
  const date = new Date().toISOString();

  const transaction = db.transaction(() => {
    if (postId) {
      db.prepare('INSERT INTO comments (id, postId, author, email, content, date, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, postId, author, email, content, date, avatar);
      db.prepare('UPDATE posts SET comments = comments + 1 WHERE id = ?').run(postId);
    } else if (momentId) {
      db.prepare('INSERT INTO comments (id, momentId, author, email, content, date, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, momentId, author, email, content, date, avatar);
    }
  });
  transaction();
  res.json({ id, postId, momentId, author, email, content, date, avatar });
});

router.delete('/comments/:id', authMiddleware, (req, res) => {
  const transaction = db.transaction(() => {
    const comment = db.prepare('SELECT postId FROM comments WHERE id = ?').get(req.params.id) as { postId: string } | undefined;
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    if (comment?.postId) {
      db.prepare('UPDATE posts SET comments = MAX(0, comments - 1) WHERE id = ?').run(comment.postId);
    }
  });
  transaction();
  res.json({ success: true });
});

router.post('/comments/bulk', authMiddleware, (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: '参数不完整' });

  const transaction = db.transaction(() => {
    for (const id of ids) {
      const comment = db.prepare('SELECT postId FROM comments WHERE id = ?').get(id) as { postId: string } | undefined;
      db.prepare('DELETE FROM comments WHERE id = ?').run(id);
      if (comment?.postId) {
        db.prepare('UPDATE posts SET comments = MAX(0, comments - 1) WHERE id = ?').run(comment.postId);
      }
    }
  });
  transaction();
  res.json({ success: true });
});

// --- Stats ---
router.get('/stats', (req, res) => {
  const posts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").get() as { count: number };
  const drafts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'draft'").get() as { count: number };
  const moments = db.prepare('SELECT COUNT(*) as count FROM moments').get() as { count: number };
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  const tags = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number };
  const comments = db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number };
  const views = db.prepare('SELECT COALESCE(SUM(views), 0) as total FROM posts').get() as { total: number };
  const likes = db.prepare('SELECT COALESCE(SUM(likes), 0) as total FROM posts').get() as { total: number };
  const momentLikes = db.prepare('SELECT COALESCE(SUM(likes), 0) as total FROM moments').get() as { total: number };

  // Recent views per day (last 7 days - simplified)
  const recentPosts = db.prepare("SELECT date, views, title FROM posts WHERE status = 'published' ORDER BY date DESC LIMIT 5").all() as any[];

  const topPosts = db.prepare("SELECT id, title, slug, views, likes, comments FROM posts WHERE status = 'published' ORDER BY views DESC LIMIT 5").all() as any[];

  res.json({
    posts: posts.count,
    categories: categories.count,
    tags: tags.count,
    comments: comments.count,
    views: views.total,
    likes: likes.total + momentLikes.total,
    recentPosts,
    topPosts,
  });
});

// --- Music Player ---
router.get('/music', authMiddleware, (_req, res) => {
  const songs = db.prepare('SELECT * FROM music ORDER BY sortOrder ASC, id ASC').all();
  res.json(songs);
});

router.post('/music', authMiddleware, uploadAudio.single('audio'), (req, res) => {
  const { title, artist } = req.body;
  if (!req.file) { res.status(400).json({ error: '请上传音频文件' }); return; }
  const id = randomUUID();
  const maxOrder = (db.prepare('SELECT MAX(sortOrder) as max FROM music').get() as any)?.max ?? -1;
  db.prepare('INSERT INTO music (id, title, artist, filename, sortOrder) VALUES (?, ?, ?, ?, ?)').run(
    id, title || req.file.originalname.replace(/\.[^.]+$/, ''), artist || 'Unknown', req.file.filename, maxOrder + 1
  );
  res.json({ id, success: true });
});

router.post('/music/cover/:id', authMiddleware, coverUpload.single('cover'), (req, res) => {
  const { id } = req.params;
  if (!req.file) { res.status(400).json({ error: '请上传封面图片' }); return; }
  db.prepare('UPDATE music SET cover = ? WHERE id = ?').run(req.file.filename, id);
  res.json({ success: true });
});

router.patch('/music/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, artist, sortOrder } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (artist !== undefined) { updates.push('artist = ?'); params.push(artist); }
  if (sortOrder !== undefined) { updates.push('sortOrder = ?'); params.push(sortOrder); }
  if (updates.length > 0) { params.push(id); db.prepare(`UPDATE music SET ${updates.join(', ')} WHERE id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete('/music/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const song = db.prepare('SELECT * FROM music WHERE id = ?').get(id) as any;
  if (song) {
    const filePath = path.join(MUSIC_DIR, song.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (song.cover) { const coverPath = path.join(MUSIC_DIR, song.cover); if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath); }
    db.prepare('DELETE FROM music WHERE id = ?').run(id);
  }
  res.json({ success: true });
});

router.get('/music/stream/:filename', (_req, res) => {
  const { filename } = _req.params;
  const filePath = path.join(MUSIC_DIR, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return; }
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.opus': 'audio/opus', '.wma': 'audio/x-ms-wma', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  res.type(mimeTypes[ext] || 'application/octet-stream');
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
});

router.get('/music/playlist', (_req, res) => {
  const songs = db.prepare('SELECT id, title, artist, cover, filename, duration FROM music ORDER BY sortOrder ASC, id ASC').all();
  const result = (songs as any[]).map(s => ({ ...s, url: `/api/music/stream/${s.filename}`, cover: s.cover ? `/api/music/stream/${s.cover}` : null }));
  res.json(result);
});

// Resolve NetEase playlist via meting API → returns song IDs for GD API playback
// Covers are fetched server-side and returned as base64 data URIs to avoid CORS issues
router.get('/music/netease-playlist/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const apiRes = await fetch(
      `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${encodeURIComponent(id)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!apiRes.ok) throw new Error(`Upstream ${apiRes.status}`);
    const data = await apiRes.json();
    if (!Array.isArray(data) || data.length === 0) { res.json([]); return; }

    const items = data.map((item: any, i: number) => {
      const urlMatch = item.url?.match(/[?&]id=(\d+)/);
      const songId = urlMatch ? urlMatch[1] : null;
      return {
        id: String(songId || i),
        title: item.name || item.title || '未知歌曲',
        artist: item.artist || item.author || '未知艺术家',
        picUrl: item.pic || item.cover || null,
        _songId: songId,
      };
    });

    // Fetch covers in parallel batches of 8 and convert to base64
    const BATCH = 8;
    const results: { coverBase64: string | null }[] = new Array(items.length).fill({ coverBase64: null });

    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          if (!item.picUrl) return null;
          try {
            const imgRes = await fetch(item.picUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
              signal: AbortSignal.timeout(8000),
            });
            if (!imgRes.ok) return null;
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const ct = imgRes.headers.get('content-type') || 'image/jpeg';
            return `data:${ct};base64,${buffer.toString('base64')}`;
          } catch {
            return null;
          }
        })
      );
      batchResults.forEach((r, j) => {
        results[i + j] = { coverBase64: r.status === 'fulfilled' ? r.value : null };
      });
    }

    const result = items.map((item, i) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      cover: results[i].coverBase64,
      _songId: item._songId,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: '无法获取网易云歌单: ' + err.message });
  }
});

// Cover image proxy — fetches remote image and serves it to avoid CORS/referrer issues
router.get('/music/cover-proxy', async (req, res) => {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing url parameter' }); return; }

  try {
    const imgRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    if (!imgRes.ok) { res.status(502).json({ error: 'Image fetch failed' }); return; }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: any) {
    if (!res.headersSent) res.status(502).json({ error: err.message });
  }
});

// Music audio proxy — streams audio from a remote URL through the server.
// The browser resolves song URLs via GD Music API, then passes them here to avoid CORS issues.
router.get('/music/proxy-stream', async (req, res) => {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing url parameter' }); return; }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
      }
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: 'Stream unavailable' });
      return;
    }

    const ct = upstream.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', ct);
    const cl = upstream.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    res.setHeader('Accept-Ranges', 'bytes');

    const reader = upstream.body.getReader();
    let cancelled = false;
    res.on('close', () => { cancelled = true; });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        res.write(value);
      }
    } finally { try { reader.releaseLock(); } catch {} }
    if (!cancelled) res.end();
  } catch (err: any) {
    if (!res.headersSent) res.status(502).json({ error: err.message });
  }
});

export default router;
