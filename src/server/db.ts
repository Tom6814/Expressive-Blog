import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import path from 'path';

import fs from 'fs';

const dbPath = process.env.DB_PATH || 'blog.db';

// Ensure the directory for the database exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

export function setupDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT,
      coverImage TEXT,
      date TEXT NOT NULL,
      categoryId TEXT,
      views INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      sticky INTEGER DEFAULT 0,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      postId TEXT,
      tagId TEXT,
      PRIMARY KEY (postId, tagId),
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS music (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT 'Unknown',
      cover TEXT,
      filename TEXT NOT NULL,
      duration REAL DEFAULT 0,
      sortOrder INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS moments (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      images TEXT,
      likes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      postId TEXT,
      momentId TEXT,
      author TEXT NOT NULL,
      email TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      avatar TEXT,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (momentId) REFERENCES moments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      nickname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      created TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      secret TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      created TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      webhookId TEXT NOT NULL,
      event TEXT NOT NULL,
      status TEXT NOT NULL,
      response TEXT DEFAULT '',
      date TEXT NOT NULL,
      FOREIGN KEY (webhookId) REFERENCES webhooks(id) ON DELETE CASCADE
    );
  `);

  // Migrations for existing databases
  try {
    db.prepare('ALTER TABLE moments ADD COLUMN likes INTEGER DEFAULT 0').run();
  } catch (e) { /* Column likely exists */ }

  try {
    db.prepare('ALTER TABLE comments ADD COLUMN momentId TEXT REFERENCES moments(id) ON DELETE CASCADE').run();
  } catch (e) { /* Column likely exists */ }
  
  try {
    db.prepare("ALTER TABLE comments ADD COLUMN email TEXT NOT NULL DEFAULT ''").run();
  } catch (e) { /* Column likely exists */ }

  try {
    db.prepare("ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'published'").run();
  } catch (e) { /* Column likely exists */ }

  try {
    db.prepare("ALTER TABLE posts ADD COLUMN sticky INTEGER DEFAULT 0").run();
  } catch (e) { /* Column likely exists */ }

  try {
    db.prepare("ALTER TABLE comments ADD COLUMN userId TEXT REFERENCES users(id)").run();
  } catch (e) { /* Column likely exists */ }

  const count = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
  if (count.count === 0) {
    seedDb();
  } else {
    // Ensure new settings exist
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run('site_title', 'Expressive.');
    insertSetting.run('site_subtitle', 'A bold, expressive blog theme.');
    insertSetting.run('site_icon', 'https://picsum.photos/seed/icon/100/100');
    insertSetting.run('custom_menu', JSON.stringify([
      { label: 'Home', path: '/' },
      { label: 'Archive', path: '/archive' },
      { label: 'Tags', path: '/tags' },
      { label: 'Moments', path: '/moments' },
      { label: 'About', path: '/about' }
    ]));
    insertSetting.run('sidebar_widgets', 'profile,search,categories,tags,recent,trending,stats');
    // Set a default password if not exists
    insertSetting.run('admin_password', 'Expressive');
  }

  // Always ensure admin user exists (both fresh and existing databases)
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('Expressive', 12);
    db.prepare('INSERT INTO users (id, username, nickname, email, password_hash, avatar, role, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), 'admin', 'Admin', 'admin@expressive.blog', hash, null, 'admin', new Date().toISOString());
  }
}

function seedDb() {
  const insertCategory = db.prepare('INSERT INTO categories (id, name, count) VALUES (?, ?, ?)');
  const insertTag = db.prepare('INSERT INTO tags (id, name, count) VALUES (?, ?, ?)');
  const insertPost = db.prepare('INSERT INTO posts (id, title, slug, excerpt, content, coverImage, date, categoryId, views, comments, likes, status, sticky) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertPostTag = db.prepare('INSERT INTO post_tags (postId, tagId) VALUES (?, ?)');
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  // Categories
  const categories = [
    { id: 'c1', name: 'Design', count: 12 },
    { id: 'c2', name: 'Development', count: 24 },
    { id: 'c3', name: 'Life', count: 8 },
    { id: 'c4', name: 'Tech', count: 15 },
  ];
  categories.forEach(c => insertCategory.run(c.id, c.name, c.count));

  // Tags
  const tags = [
    { id: 't1', name: 'React', count: 10 },
    { id: 't2', name: 'Material Design', count: 8 },
    { id: 't3', name: 'TypeScript', count: 15 },
    { id: 't4', name: 'CSS', count: 5 },
    { id: 't5', name: 'Vite', count: 4 },
    { id: 't6', name: 'Animation', count: 7 },
    { id: 't7', name: 'UX', count: 9 },
  ];
  tags.forEach(t => insertTag.run(t.id, t.name, t.count));

  // Posts
  const posts = [
    {
      id: 'p1',
      title: 'Embracing Material Design 3 Expressive',
      slug: 'embracing-md3-expressive',
      excerpt: 'Material Design 3 introduces a more expressive, personal, and dynamic approach to UI design. Let\'s explore how to implement it in modern web apps.',
      content: '# Embracing Material Design 3 Expressive\n\nMaterial Design 3 (MD3) is the latest iteration of Google\'s design system. It brings a significant shift towards personalization, expressiveness, and dynamic color.\n\n## Key Features\n\n1. **Dynamic Color**: UI colors adapt to the user\'s wallpaper or a chosen seed color.\n2. **Expressive Shapes**: Larger corner radii, asymmetrical shapes, and more playful geometry.\n3. **Typography**: Bolder, larger headings that make a statement.\n\n### Implementation in React\n\nTo implement MD3 in React, we can use CSS variables and Tailwind CSS to create a flexible, themeable system.\n\n```tsx\nconst ThemeProvider = ({ children }) => {\n  // Theme logic here\n  return <div className="theme-root">{children}</div>;\n};\n```\n\nThe expressive nature of MD3 allows for more creative freedom while maintaining usability and accessibility.',
      coverImage: 'https://picsum.photos/seed/md3/1200/600',
      date: '2023-10-25T10:00:00Z',
      categoryId: 'c1',
      views: 1250,
      comments: 24,
      likes: 150,
      tagIds: ['t2', 't7']
    },
    {
      id: 'p2',
      title: 'Building a Headless Typecho Theme',
      slug: 'headless-typecho-theme',
      excerpt: 'How to decouple your Typecho backend and build a blazing fast frontend using React, Vite, and Framer Motion.',
      content: '# Building a Headless Typecho Theme\n\nTypecho is a fantastic, lightweight blogging platform. But what if you want the power of a modern JavaScript framework for your frontend?\n\n## The Headless Approach\n\nBy using Typecho\'s REST API (via plugins), we can fetch our content and render it using React.\n\n### Benefits\n\n- **Performance**: Static site generation or client-side routing makes navigation instant.\n- **Flexibility**: Use any UI library, animation framework, or styling solution.\n- **Security**: The backend can be hidden away, exposing only the necessary API endpoints.\n\nThis theme is a demonstration of what\'s possible when you combine a solid CMS with a modern frontend stack.',
      coverImage: 'https://picsum.photos/seed/typecho/1200/600',
      date: '2023-10-20T14:30:00Z',
      categoryId: 'c2',
      views: 890,
      comments: 12,
      likes: 85,
      tagIds: ['t1', 't3', 't5']
    },
    {
      id: 'p3',
      title: 'The Art of Fluid Typography',
      slug: 'art-of-fluid-typography',
      excerpt: 'Creating typography that scales perfectly across all devices without complex media queries.',
      content: '# The Art of Fluid Typography\n\nResponsive design often relies on breakpoints to adjust font sizes. Fluid typography offers a smoother approach.\n\n## CSS Clamp\n\nThe `clamp()` function in CSS is a game-changer for fluid typography.\n\n```css\nh1 {\n  font-size: clamp(2rem, 5vw, 4rem);\n}\n```\n\nThis ensures the heading is never smaller than 2rem, never larger than 4rem, and scales fluidly in between based on the viewport width.\n\nCombined with Material Design 3\'s expressive typography scales, fluid typography creates stunning, readable interfaces on any screen.',
      coverImage: null,
      date: '2023-10-15T09:15:00Z',
      categoryId: 'c1',
      views: 2100,
      comments: 45,
      likes: 320,
      tagIds: ['t4', 't7']
    },
    {
      id: 'p4',
      title: 'Animating with Framer Motion',
      slug: 'animating-framer-motion',
      excerpt: 'Bring your React applications to life with declarative, physics-based animations.',
      content: '# Animating with Framer Motion\n\nFramer Motion is the animation library for React. It makes complex animations simple and declarative.\n\n## Layout Animations\n\nOne of the most powerful features is layout animations. Simply adding the `layout` prop to a `motion` component makes it animate smoothly when its position or size changes.\n\n```tsx\n<motion.div layout>\n  {/* Content */}\n</motion.div>\n```\n\nIn this theme, we use Framer Motion for page transitions, hover effects, and list animations, creating a truly expressive and interactive experience.',
      coverImage: 'https://picsum.photos/seed/motion/1200/600',
      date: '2023-10-10T16:45:00Z',
      categoryId: 'c2',
      views: 1560,
      comments: 31,
      likes: 190,
      tagIds: ['t1', 't6']
    },
    {
      id: 'p5',
      title: 'A Weekend in the Mountains',
      slug: 'weekend-in-mountains',
      excerpt: 'Disconnecting from technology and reconnecting with nature. A photo essay of my recent trip.',
      content: '# A Weekend in the Mountains\n\nSometimes you just need to get away from the screen.\n\nThe crisp air, the sound of the wind through the pines, and the stunning vistas provide a much-needed reset for the mind.\n\n*More photos coming soon...*',
      coverImage: 'https://picsum.photos/seed/mountain/1200/600',
      date: '2023-10-05T08:00:00Z',
      categoryId: 'c3',
      views: 540,
      comments: 8,
      likes: 45,
      tagIds: []
    }
  ];

  posts.forEach(p => {
    insertPost.run(p.id, p.title, p.slug, p.excerpt, p.content, p.coverImage, p.date, p.categoryId, p.views, p.comments, p.likes, 'published', 0);
    p.tagIds.forEach(tId => insertPostTag.run(p.id, tId));
  });

  // Settings
  insertSetting.run('site_title', 'Expressive.');
  insertSetting.run('site_subtitle', 'A bold, expressive blog theme.');
  insertSetting.run('site_icon', 'https://picsum.photos/seed/icon/100/100');
  insertSetting.run('author_name', 'Expressive Blogger');
  insertSetting.run('author_bio', 'Exploring the boundaries of Material Design 3 Expressive and modern web development. Sharing thoughts, code, and life.');
  insertSetting.run('author_avatar', 'https://picsum.photos/seed/avatar/200/200');
  insertSetting.run('social_github', 'https://github.com');
  insertSetting.run('social_twitter', 'https://twitter.com');
  insertSetting.run('social_dribbble', 'https://dribbble.com');
  insertSetting.run('custom_menu', JSON.stringify([
    { label: 'Home', path: '/' },
    { label: 'Archive', path: '/archive' },
    { label: 'Tags', path: '/tags' },
    { label: 'Moments', path: '/moments' },
    { label: 'About', path: '/about' }
  ]));
  insertSetting.run('sidebar_widgets', 'profile,search,categories,tags,recent,trending,stats');
  insertSetting.run('admin_password', 'Expressive');
  
  // Moments
  const insertMoment = db.prepare('INSERT INTO moments (id, content, date, images) VALUES (?, ?, ?, ?)');
  insertMoment.run(randomUUID(), 'Just deployed the new Expressive Theme! It feels so smooth with Framer Motion. 🚀', new Date().toISOString(), JSON.stringify([]));
  insertMoment.run(randomUUID(), 'Coffee and code. Best way to start the morning. ☕', new Date(Date.now() - 86400000).toISOString(), JSON.stringify(['https://picsum.photos/seed/coffee/600/400']));

  // Comments
  const insertComment = db.prepare('INSERT INTO comments (id, postId, author, email, content, date, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  // Add comments to first post
  insertComment.run(randomUUID(), 'p1', 'Alice', 'alice@example.com', 'This is a fantastic update! Love the new design language.', new Date(Date.now() - 10000000).toISOString(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice');
  insertComment.run(randomUUID(), 'p1', 'Bob', 'bob@example.com', 'Great explanation of MD3. Can\'t wait to try it out.', new Date(Date.now() - 5000000).toISOString(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob');
  
  // Add comments to second post
  insertComment.run(randomUUID(), 'p2', 'Charlie', 'charlie@example.com', 'Typecho + React is a killer combo. Thanks for sharing!', new Date(Date.now() - 2000000).toISOString(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie');

  // Recalculate counts to ensure they are correct
  db.prepare(`
    UPDATE categories 
    SET count = (
      SELECT COUNT(*) 
      FROM posts 
      WHERE posts.categoryId = categories.id
    )
  `).run();

  db.prepare(`
    UPDATE tags 
    SET count = (
      SELECT COUNT(*) 
      FROM post_tags 
      WHERE post_tags.tagId = tags.id
    )
  `).run();
}

export default db;
