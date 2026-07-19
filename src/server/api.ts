import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import crypto from 'crypto';
import db from './db';

const router = Router();

// --- JWT Config ---
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  const randomSecret = (isProd ? '' : 'dev-') + randomUUID();
  console.warn(`[${isProd ? 'PROD' : 'DEV'}] Using randomly generated JWT_SECRET. Set JWT_SECRET env var for persistence across restarts.`);
  return randomSecret;
})();
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

// --- Backup Import Config ---
const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('仅支持 ZIP 文件'));
    }
  },
});

// --- Rate Limiter ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// --- Auth ---
router.post('/login', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(`auth:${ip}`, 10, 60_000)) return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  next();
}, (req, res) => {
  const { password } = req.body;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
  const adminPassword = row?.value?.trim() || 'Expressive';

  if (password?.trim() === adminPassword) {
    const token = generateToken();
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

// --- User Account System ---

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password: string, hash: string): 'match' | 'migrate' | false {
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  if (hash.startsWith('$2')) {
    return bcrypt.compareSync(password, hash) ? 'match' : false;
  }
  // Legacy SHA-256 hash (64 hex characters) — allow migration
  if (/^[0-9a-f]{64}$/.test(hash)) {
    const sha256 = crypto.createHash('sha256').update(password).digest('hex');
    return sha256 === hash ? 'migrate' : false;
  }
  return false;
}

function userAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: '请先登录' });
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId: string; admin?: boolean };
    (req as any).userId = payload.userId;
    (req as any).isAdmin = payload.admin || false;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

// --- CAPTCHA ---
const captchaStore = new Map<string, { answer: number; expiresAt: number }>();

// Clean expired captchas periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (now > val.expiresAt) captchaStore.delete(key);
  }
}, 60_000);

router.get('/captcha', (_req, res) => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = a + b;
  const captchaId = randomUUID();
  captchaStore.set(captchaId, { answer, expiresAt: Date.now() + 5 * 60_000 });
  res.json({ captchaId, question: `${a} + ${b} = ?` });
});

function verifyCaptcha(captchaId: string | undefined, userAnswer: string | number | undefined): boolean {
  if (!captchaId || userAnswer === undefined || userAnswer === null || userAnswer === '') return false;
  const entry = captchaStore.get(captchaId);
  if (!entry || Date.now() > entry.expiresAt) return false;
  captchaStore.delete(captchaId); // one-time use
  return Number(userAnswer) === entry.answer;
}

// User registration
router.post('/users/register', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(`register:${ip}`, 5, 60_000)) return res.status(429).json({ error: '注册请求过于频繁，请稍后再试' });
  next();
}, (req, res) => {
  try {
    const { username, nickname, email, password, avatar, captchaId, captchaAnswer } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    if (!/^[a-z0-9_]+$/.test(username)) return res.status(400).json({ error: '用户名仅支持小写字母、数字和下划线' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: '用户名长度为 3-20 个字符' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少需要 6 个字符' });
    if (!verifyCaptcha(captchaId, captchaAnswer)) return res.status(400).json({ error: '验证码错误或已过期' });

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) return res.status(400).json({ error: '用户名或邮箱已被注册' });

    const id = 'u_' + randomUUID();
    const passwordHash = hashPassword(password);
    const displayNickname = (nickname || username).trim();
    db.prepare('INSERT INTO users (id, username, nickname, email, password_hash, avatar, role, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, username.toLowerCase(), displayNickname, email.toLowerCase(), passwordHash, avatar || null, 'user', new Date().toISOString());

    const token = jwt.sign({ userId: id, admin: false }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id, username: username.toLowerCase(), nickname: displayNickname, email: email.toLowerCase(), avatar: avatar || null, role: 'user' } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User login
router.post('/users/login', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(`user-login:${ip}`, 10, 60_000)) return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  next();
}, (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase()) as any;
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });

    const verifyResult = verifyPassword(password, user.password_hash);
    if (!verifyResult) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // Auto-migrate legacy SHA-256 hashes to bcrypt
    if (verifyResult === 'migrate') {
      const newHash = hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    }

    const isAdmin = user.role === 'admin';
    const token = jwt.sign({ userId: user.id, admin: isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true, token,
      user: { id: user.id, username: user.username, nickname: user.nickname, email: user.email, avatar: user.avatar, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/users/me', userAuthMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, email, avatar, role, created FROM users WHERE id = ?').get((req as any).userId) as any;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// Update own profile
router.put('/users/me', userAuthMiddleware, (req, res) => {
  const { nickname, avatar, email } = req.body;
  const userId = (req as any).userId;
  if (nickname !== undefined) db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), userId);
  if (avatar !== undefined) db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, userId);
  if (email !== undefined && email) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.toLowerCase().trim(), userId);
  const updated = db.prepare('SELECT id, username, nickname, email, avatar, role FROM users WHERE id = ?').get(userId);
  res.json(updated);
});

// Admin: list users
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, nickname, email, role, created FROM users ORDER BY created DESC').all();
  res.json(users);
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: '新密码至少需要6个字符' });
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as { value: string } | undefined;
  const currentPassword = row?.value?.trim() || 'Expressive';

  if (oldPassword?.trim() === currentPassword) {
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
const SENSITIVE_KEYS = new Set(['admin_password', 'jwt_secret', 'webhook_secret']);

router.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[];
  const settings = rows.reduce((acc, row) => {
    if (!SENSITIVE_KEYS.has(row.key) && !row.key.startsWith('admin_') && !row.key.startsWith('secret_')) {
      acc[row.key] = row.value;
    }
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
  fireWebhooks('post_created', { id, title, slug, status });
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
  fireWebhooks('post_updated', { id, title, slug, status });
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
  fireWebhooks('post_deleted', { id });
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
  fireWebhooks('moment_created', { id, content });
  syncMomentToMemos(content, images).catch(() => {}); // fire-and-forget reverse sync
  res.json({ id, content, date, images: images || [], likes: 0, commentCount: 0 });
});

router.delete('/moments/:id', authMiddleware, (req, res) => {
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE momentId = ?').run(req.params.id);
    db.prepare('DELETE FROM moments WHERE id = ?').run(req.params.id);
  });
  transaction();
  fireWebhooks('moment_deleted', { id: req.params.id });
  res.json({ success: true });
});

// --- Comments ---
function sanitizeContent(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

router.get('/comments', (req, res) => {
  const { postId, momentId, page = '1', limit = '20' } = req.query;

  if (postId) {
    const comments = db.prepare(`
      SELECT c.*, u.username, u.nickname as user_nickname
      FROM comments c
      LEFT JOIN users u ON c.userId = u.id
      WHERE c.postId = ?
      ORDER BY c.date DESC
    `).all(postId);
    return res.json({ data: comments, total: comments.length });
  }
  if (momentId) {
    const comments = db.prepare(`
      SELECT c.*, u.username, u.nickname as user_nickname
      FROM comments c
      LEFT JOIN users u ON c.userId = u.id
      WHERE c.momentId = ?
      ORDER BY c.date DESC
    `).all(momentId);
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
  const { postId, momentId, author, email, content, avatar, userId } = req.body;
  if ((!postId && !momentId) || !author || !email || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sanitizedContent = sanitizeContent(content);
  const sanitizedAuthor = sanitizeContent(author?.slice(0, 50) || '');

  const id = 'cmt_' + randomUUID();
  const date = new Date().toISOString();

  const transaction = db.transaction(() => {
    if (postId) {
      db.prepare('INSERT INTO comments (id, postId, author, email, content, date, avatar, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, postId, sanitizedAuthor, email, sanitizedContent, date, avatar, userId || null);
      db.prepare('UPDATE posts SET comments = comments + 1 WHERE id = ?').run(postId);
    } else if (momentId) {
      db.prepare('INSERT INTO comments (id, momentId, author, email, content, date, avatar, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, momentId, sanitizedAuthor, email, sanitizedContent, date, avatar, userId || null);
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

// Allowed hosts for music proxy (SSRF protection)
const ALLOWED_PROXY_HOSTS = [
  /\.music\.126\.net$/,
  /\.music\.163\.com$/,
  /\.netease\.com$/,
  /\.126\.net$/,
];
const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isAllowedProxyUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    // Only allow http/https
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    // Block internal IPs
    const hostname = u.hostname;
    for (const ip of BLOCKED_IP_PATTERNS) {
      if (ip.test(hostname)) return false;
    }
    // Check allowed host list
    for (const allowed of ALLOWED_PROXY_HOSTS) {
      if (allowed.test(hostname)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Cover image proxy — fetches remote image and serves it to avoid CORS/referrer issues
router.get('/music/cover-proxy', async (req, res) => {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing url parameter' }); return; }
  if (!isAllowedProxyUrl(url)) { res.status(403).json({ error: 'URL not allowed' }); return; }

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
  if (!isAllowedProxyUrl(url)) { res.status(403).json({ error: 'URL not allowed' }); return; }

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

// ============================================================
// Webhook utility — forward events to registered webhooks
// ============================================================
async function fireWebhooks(event: string, payload: any) {
  const webhooks = db.prepare('SELECT * FROM webhooks WHERE enabled = 1 AND events LIKE ?').all(`%${event}%`) as any[];
  if (webhooks.length === 0) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(webhooks.map(async wh => {
    const logId = randomUUID();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(wh.secret ? { 'X-Webhook-Secret': wh.secret } : {}),
          'X-Event': event,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const status = res.ok ? 'success' : 'failed';
      const response = res.ok ? `${res.status} OK` : `${res.status} ${res.statusText}`;
      db.prepare('INSERT INTO webhook_logs (id, webhookId, event, status, response, date) VALUES (?, ?, ?, ?, ?, ?)').run(logId, wh.id, event, status, response, new Date().toISOString());
    } catch (err: any) {
      db.prepare('INSERT INTO webhook_logs (id, webhookId, event, status, response, date) VALUES (?, ?, ?, ?, ?, ?)').run(logId, wh.id, event, 'failed', err.message, new Date().toISOString());
    }
  }));
}

function verifyWebhookSignature(req: Request): boolean {
  const secret = db.prepare("SELECT value FROM settings WHERE key = 'webhook_secret'").get() as any;
  // If no webhook secret is configured, allow requests (backwards compatible)
  if (!secret || !secret.value) return true;
  const signature = req.headers['x-webhook-signature'] as string;
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret.value)
    .update(JSON.stringify(req.body))
    .digest('hex');
  const expectedSig = `sha256=${expected}`;
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

// Incoming webhook endpoint
router.post('/webhooks/incoming', (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  const { event } = req.query;
  const body = req.body;
  console.log(`[Incoming Webhook] event=${event}`, JSON.stringify(body).slice(0, 200));
  // Handle incoming events
  if (event === 'create_post') {
    const { title, slug, content, excerpt, categoryId } = body;
    if (title && slug && content) {
      const id = 'p_' + randomUUID();
      const date = new Date().toISOString();
      db.prepare('INSERT INTO posts (id, title, slug, excerpt, content, coverImage, date, categoryId, views, comments, likes, status, sticky) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 0)').run(id, title, slug, excerpt || '', content, body.coverImage || '', date, categoryId || null, body.status || 'published');
      res.json({ success: true, id });
      return;
    }
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (event === 'create_moment') {
    const { content, images } = body;
    if (content?.trim()) {
      const id = 'm_' + randomUUID();
      db.prepare('INSERT INTO moments (id, content, date, images, likes) VALUES (?, ?, ?, ?, 0)').run(id, content, new Date().toISOString(), JSON.stringify(images || []));
      res.json({ success: true, id });
      return;
    }
    return res.status(400).json({ error: 'Content is required' });
  }
  res.json({ success: true, message: 'Event received' });
});

// Admin: manage webhooks
router.get('/webhooks', authMiddleware, (req, res) => {
  const webhooks = db.prepare('SELECT w.*, (SELECT COUNT(*) FROM webhook_logs WHERE webhookId = w.id) as logCount, (SELECT status FROM webhook_logs WHERE webhookId = w.id ORDER BY date DESC LIMIT 1) as lastStatus FROM webhooks w ORDER BY w.created DESC').all();
  res.json(webhooks);
});

router.post('/webhooks', authMiddleware, (req, res) => {
  const { name, url, events, secret } = req.body;
  if (!name || !url || !events) return res.status(400).json({ error: '请填写名称、URL 和事件' });
  const id = randomUUID();
  db.prepare('INSERT INTO webhooks (id, name, url, events, secret, enabled, created) VALUES (?, ?, ?, ?, ?, 1, ?)').run(id, name, url, JSON.stringify(events), secret || '', new Date().toISOString());
  res.json({ id });
});

router.put('/webhooks/:id', authMiddleware, (req, res) => {
  const { name, url, events, secret, enabled } = req.body;
  db.prepare('UPDATE webhooks SET name=?, url=?, events=?, secret=?, enabled=? WHERE id=?').run(name, url, JSON.stringify(events), secret || '', enabled ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/webhooks/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM webhooks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/webhooks/:id/logs', authMiddleware, (req, res) => {
  const logs = db.prepare('SELECT * FROM webhook_logs WHERE webhookId = ? ORDER BY date DESC LIMIT 50').all(req.params.id);
  res.json(logs);
});

// ============================================================
// Memos webhook receiver
// ============================================================
router.post('/webhooks/memos', (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  try {
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'memos_webhook_enabled'").get() as any;
    if (!enabled || enabled.value !== '1') {
      return res.status(200).json({ message: 'Memos webhook disabled' });
    }

    const { activityType, creatorId, memo } = req.body;
    if (activityType !== 'memos.memo.created' || !memo?.content) {
      return res.status(200).json({ message: 'Ignored event' });
    }

    // Filter by allowed user IDs
    const userFilter = db.prepare("SELECT value FROM settings WHERE key = 'memos_user_filter'").get() as any;
    if (userFilter?.value?.trim()) {
      const allowedIds = userFilter.value.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (allowedIds.length > 0) {
        const creatorName = req.body.creatorName || req.body.creatorUsername || '';
        const isAllowed = allowedIds.includes(String(creatorId)) || (creatorName && allowedIds.includes(creatorName));
        if (!isAllowed) {
          return res.status(200).json({ message: 'Creator not in allowed list' });
        }
      }
    }

    // Check for duplicate (avoid creating same memo twice)
    const existing = db.prepare("SELECT id FROM moments WHERE content = ? ORDER BY date DESC LIMIT 1").get(memo.content?.trim()) as any;
    if (existing) {
      return res.status(200).json({ message: 'Duplicate detected' });
    }

    // Extract image URLs from memo attachments/resources
    // Memos proto uses "attachments" (v0.22+), also support legacy formats
    const rawResources = memo.attachments || memo.resourceList || memo.resources || memo.resource_list || [];
    const memosBaseUrl = db.prepare("SELECT value FROM settings WHERE key = 'memos_base_url'").get() as any;
    const baseUrl = memosBaseUrl?.value?.trim().replace(/\/$/, '') || '';

    const imageUrls: string[] = rawResources
      .filter((r: any) => r?.type && r.type.startsWith('image/'))
      .map((r: any) => {
        // Use externalLink if available and non-empty
        if (r.externalLink) return r.externalLink;
        // Construct URL from attachment name (format: attachments/{id}) + filename
        if (baseUrl && r.name) {
          const filePath = r.filename ? `${r.name}/${r.filename}` : r.name;
          return `${baseUrl}/file/${filePath}`;
        }
        // Legacy: construct from id/uid
        if (baseUrl && (r.id || r.uid)) {
          const resourceId = r.id ? `r/${r.id}` : `f/${r.uid}`;
          return `${baseUrl}/file/${r.name || r.filename || resourceId}`;
        }
        return null;
      })
      .filter(Boolean) as string[];

    const id = 'm_' + randomUUID();
    const date = new Date().toISOString();
    db.prepare('INSERT INTO moments (id, content, date, images, likes) VALUES (?, ?, ?, ?, 0)')
      .run(id, memo.content?.trim(), date, JSON.stringify(imageUrls));

    console.log(`[Memos] Created moment from memo by creatorId=${creatorId}: ${memo.content?.slice(0, 50)}`);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('[Memos webhook error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Reverse sync: push moments from blog to Memos ---
async function syncMomentToMemos(content: string, imageUrls: string[] = []): Promise<boolean> {
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'memos_reverse_sync'").get() as any;
  if (!enabled || enabled.value !== '1') return false;

  const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'memos_api_token'").get() as any;
  const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'memos_base_url'").get() as any;
  if (!tokenRow?.value || !urlRow?.value) return false;

  const baseUrl = urlRow.value.replace(/\/$/, '');
  const token = tokenRow.value;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const attachmentNames: string[] = [];

  // Upload images as Memos attachments
  for (const imageUrl of imageUrls) {
    if (!imageUrl?.trim()) continue;
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);

      // 1. Download image
      const imgRes = await fetch(imageUrl, { signal: ctrl.signal });
      if (!imgRes.ok) continue;
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.split('/')[1] || 'jpg';
      const filename = `image.${ext}`;

      // 2. Upload to Memos as attachment (base64-encoded)
      const uploadRes = await fetch(`${baseUrl}/api/v1/attachments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename,
          content: imgBuffer.toString('base64'),
          type: contentType,
        }),
        signal: ctrl.signal,
      });
      if (!uploadRes.ok) continue;
      const attachment = await uploadRes.json() as any;
      if (attachment.name) {
        attachmentNames.push(attachment.name);
      }
    } catch (err: any) {
      console.error('[Memos image upload error]', err.message);
      // Continue with other images even if one fails
    }
  }

  // 3. Create memo with attachments
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const body: any = { state: 'NORMAL', content, visibility: 'PUBLIC' };
    if (attachmentNames.length > 0) {
      body.attachments = attachmentNames.map(name => ({ name }));
    }
    const res = await fetch(`${baseUrl}/api/v1/memos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return res.ok;
  } catch (err: any) {
    console.error('[Memos reverse sync error]', err.message);
    return false;
  }
}

// ============================================================
// Full data export / import
// ============================================================
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip();

    const tables = ['settings', 'posts', 'moments', 'comments', 'categories', 'tags', 'post_tags', 'webhooks', 'users'];

    for (const table of tables) {
      let data: any[];
      if (table === 'post_tags') {
        data = db.prepare('SELECT * FROM post_tags').all();
      } else {
        data = db.prepare(`SELECT * FROM ${table}`).all();
      }
      zip.addFile(`${table}.json`, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));
    }

    zip.addFile('manifest.json', Buffer.from(JSON.stringify({
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables: tables.filter(t => t !== 'post_tags' && t !== 'webhook_logs'),
    }, null, 2), 'utf-8'));

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="blog-export-${new Date().toISOString().slice(0, 10)}.zip"`);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', authMiddleware, zipUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传 ZIP 文件' });

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(req.file.buffer);

    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) return res.status(400).json({ error: '无效的备份文件：缺少 manifest.json' });

    const manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
    if (!manifest.version) return res.status(400).json({ error: '无效的备份文件：版本不匹配' });

    const importTransaction = db.transaction(() => {
      // Clear existing data in reverse dependency order
      db.prepare('DELETE FROM comments').run();
      db.prepare('DELETE FROM post_tags').run();
      db.prepare('DELETE FROM posts').run();
      db.prepare('DELETE FROM moments').run();
      db.prepare('DELETE FROM tags').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM webhooks').run();
      db.prepare("DELETE FROM users WHERE role != 'admin'").run();
      // Keep settings (especially auth-related ones)

      const importTable = (table: string) => {
        const entry = zip.getEntry(`${table}.json`);
        if (!entry) return;
        const rows = JSON.parse(entry.getData().toString('utf-8'));
        if (!Array.isArray(rows) || rows.length === 0) return;

        if (table === 'settings') {
          const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
          for (const row of rows) {
            if (row.key === 'jwt_secret' || row.key === 'admin_password' || row.key === 'password_hash') continue;
            stmt.run(row.key, row.value);
          }
        } else if (table === 'categories') {
          const stmt = db.prepare('INSERT INTO categories (id, name, slug, description, count) VALUES (?, ?, ?, ?, ?)');
          for (const row of rows) stmt.run(row.id, row.name, row.slug, row.description || '', row.count || 0);
        } else if (table === 'tags') {
          const stmt = db.prepare('INSERT INTO tags (id, name, slug, count) VALUES (?, ?, ?, ?)');
          for (const row of rows) stmt.run(row.id, row.name, row.slug, row.count || 0);
        } else if (table === 'posts') {
          const stmt = db.prepare('INSERT INTO posts (id, title, slug, excerpt, content, coverImage, date, categoryId, views, comments, likes, status, sticky) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          for (const row of rows) stmt.run(row.id, row.title, row.slug, row.excerpt || '', row.content, row.coverImage || '', row.date, row.categoryId || null, row.views || 0, row.comments || 0, row.likes || 0, row.status || 'published', row.sticky || 0);
        } else if (table === 'post_tags') {
          const stmt = db.prepare('INSERT INTO post_tags (postId, tagId) VALUES (?, ?)');
          for (const row of rows) stmt.run(row.postId, row.tagId);
        } else if (table === 'moments') {
          const stmt = db.prepare('INSERT INTO moments (id, content, date, images, likes) VALUES (?, ?, ?, ?, ?)');
          for (const row of rows) stmt.run(row.id, row.content, row.date, row.images || '[]', row.likes || 0);
        } else if (table === 'comments') {
          const stmt = db.prepare('INSERT INTO comments (id, postId, momentId, author, email, content, date, avatar, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
          for (const row of rows) stmt.run(row.id, row.postId || null, row.momentId || null, row.author, row.email, row.content, row.date, row.avatar || '', row.userId || null);
        } else if (table === 'webhooks') {
          const stmt = db.prepare('INSERT INTO webhooks (id, name, url, events, secret, enabled, created) VALUES (?, ?, ?, ?, ?, ?, ?)');
          for (const row of rows) stmt.run(row.id, row.name, row.url, row.events, row.secret || '', row.enabled || 0, row.created);
        } else if (table === 'users') {
          const stmt = db.prepare('INSERT OR IGNORE INTO users (id, username, nickname, email, password_hash, avatar, role, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
          for (const row of rows) {
            if (row.role === 'admin') continue; // Skip admin — keep the existing one
            stmt.run(row.id, row.username, row.nickname, row.email, row.password_hash, row.avatar || null, row.role || 'user', row.created);
          }
        }
      };

      for (const table of manifest.tables) {
        importTable(table);
      }
      // Also import post_tags if present
      if (zip.getEntry('post_tags.json')) importTable('post_tags');
    });

    importTransaction();
    res.json({ success: true, message: '导入完成，请刷新页面' });
  } catch (err: any) {
    console.error('[Import error]', err);
    res.status(500).json({ error: `导入失败: ${err.message}` });
  }
});

export default router;
