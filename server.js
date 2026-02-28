/**
 * Winglish backend (Seçenek B)
 * - GET/POST /api/data: tüm uygulama verisini senkronize et
 * - POST /api/contact: iletişim formu mesajı kaydet (+ isteğe bağlı e-posta)
 * - GET /api/testimonials: veli yorumları listesi
 * - POST /api/testimonials: yeni veli yorumu ekle (body: { name, text })
 * - Statik: public/ (index.html = ana uygulama)
 */
process.on('uncaughtException', (err) => {
  console.error('Uncaught error:', err);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const TESTIMONIALS_KEY = 'winglish_testimonials';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbPath = path.join(__dirname, 'winglish.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const getStmt = db.prepare('SELECT value FROM kv WHERE key = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');

function getTestimonials() {
  const row = getStmt.get(TESTIMONIALS_KEY);
  if (!row || !row.value) return [];
  try { return JSON.parse(row.value); } catch (_) { return []; }
}

function setTestimonials(arr) {
  setStmt.run(TESTIMONIALS_KEY, JSON.stringify(arr));
}

// E-posta (isteğe bağlı)
let mailTransport = null;
if (process.env.RESEND_API_KEY) {
  mailTransport = nodemailer.createTransport({
    host: 'smtp.resend.com', port: 465, secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
  });
} else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function sendContactNotification(msg) {
  if (!ADMIN_EMAIL || !mailTransport) return Promise.resolve();
  const text = `Yeni iletişim mesajı:\nAd Soyad: ${msg.adSoyad || ''}\nYaş/Sınıf: ${msg.yasSinif || ''}\nCep: ${msg.veliCep || ''}\n\n${msg.metin || ''}`;
  return mailTransport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: ADMIN_EMAIL,
    subject: 'Winglish – Yeni iletişim mesajı',
    text
  }).catch(() => {});
}

// ═══ DATA SYNC (mevcut winglish key'leri) ═══
const DATA_KEYS = [
  'winglish_students_v1', 'winglish_news_v1', 'winglish_packages_v1',
  'winglish_packages_page_title', 'winglish_packages_page_sub',
  'winglish_student_passwords', 'winglish_contact_messages',
  'winglish_inbox_seen_count', 'winglish_contact_form_title',
  'winglish_news_title', 'winglish_contact_labels',
  'winglish_hwData_v2', 'winglish_submissions', 'winglish_sNotifs',
  'winglish_testimonials', 'winglish_blog_posts'
];

function getData() {
  const out = {};
  for (const k of DATA_KEYS) {
    const row = getStmt.get(k);
    if (row && row.value != null) out[k] = row.value;
  }
  return out;
}

function setData(data) {
  const keys = Object.keys(data).filter(k => k.startsWith('winglish_'));
  const run = db.transaction(() => {
    for (const k of keys) {
      const v = data[k];
      setStmt.run(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  });
  run();
}

app.get('/api/data', (req, res) => {
  try {
    res.json(getData());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    setData(req.body || {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contact', (req, res) => {
  try {
    const msg = req.body || {};
    const inbox = (() => {
      const row = getStmt.get('winglish_contact_messages');
      if (!row || !row.value) return [];
      try { return JSON.parse(row.value); } catch (_) { return []; }
    })();
    const newMsg = {
      adSoyad: msg.adSoyad || '', yasSinif: msg.yasSinif || '',
      veliCep: msg.veliCep || '', metin: msg.metin || '',
      fromPackage: msg.fromPackage || '', createdAt: msg.createdAt || new Date().toISOString()
    };
    inbox.unshift(newMsg);
    setStmt.run('winglish_contact_messages', JSON.stringify(inbox));
    sendContactNotification(newMsg).then(() => res.json({ ok: true })).catch(() => res.json({ ok: true }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══ TESTIMONIALS (status: pending | approved, adminReply) ═══
function migrateTestimonial(t) {
  if (!t) return t;
  if (!t.id) t.id = 't' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  if (!t.status) t.status = 'approved'; // eski kayıtlar onaylı sayılır
  return t;
}

app.get('/api/testimonials', (req, res) => {
  try {
    const list = getTestimonials().map(migrateTestimonial).filter(t => t.status === 'approved');
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/testimonials/pending', (req, res) => {
  try {
    const list = getTestimonials().map(migrateTestimonial).filter(t => t.status === 'pending');
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/testimonials', (req, res) => {
  try {
    const { name, text } = req.body || {};
    const list = getTestimonials().map(migrateTestimonial);
    list.unshift({
      id: 't' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      name: (name || '').trim().slice(0, 200),
      text: (text || '').trim().slice(0, 2000),
      status: 'pending',
      adminReply: '',
      createdAt: new Date().toISOString()
    });
    setTestimonials(list);
    res.json({ ok: true, message: 'Yorumunuz onay sonrası yayınlanacaktır.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/testimonials/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply } = req.body || {};
    const list = getTestimonials().map(migrateTestimonial);
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Bulunamadı' });
    list[idx].status = 'approved';
    list[idx].adminReply = (adminReply || '').trim().slice(0, 2000);
    list[idx].approvedAt = new Date().toISOString();
    setTestimonials(list);
    res.json(list[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══ BLOG ═══
const BLOG_KEY = 'winglish_blog_posts';

function getBlogPosts() {
  const row = getStmt.get(BLOG_KEY);
  if (!row || !row.value) return [];
  try { return JSON.parse(row.value); } catch (_) { return []; }
}

function setBlogPosts(arr) {
  setStmt.run(BLOG_KEY, JSON.stringify(arr));
}

app.get('/api/blog', (req, res) => {
  try {
    res.json(getBlogPosts());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/blog', (req, res) => {
  try {
    const { title, excerpt, body } = req.body || {};
    const list = getBlogPosts();
    const post = {
      id: 'b' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      title: (title || '').trim().slice(0, 200),
      excerpt: (excerpt || '').trim().slice(0, 500),
      body: (body || '').trim().slice(0, 10000),
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
    list.unshift(post);
    setBlogPosts(list);
    res.json(post);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/blog/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, body } = req.body || {};
    const list = getBlogPosts();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Bulunamadı' });
    if (title != null) list[idx].title = String(title).trim().slice(0, 200);
    if (excerpt != null) list[idx].excerpt = String(excerpt).trim().slice(0, 500);
    if (body != null) list[idx].body = String(body).trim().slice(0, 10000);
    list[idx].updatedAt = new Date().toISOString();
    setBlogPosts(list);
    res.json(list[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/blog/:id', (req, res) => {
  try {
    const { id } = req.params;
    const list = getBlogPosts().filter(p => p.id !== id);
    setBlogPosts(list);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Statik
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/', (req, res) => {
    const index = path.join(publicDir, 'index.html');
    if (fs.existsSync(index)) res.sendFile(index);
    else res.status(404).send('index.html bulunamadı.');
  });
}

app.listen(PORT, () => {
  console.log('Winglish backend: http://localhost:' + PORT);
  if (!ADMIN_EMAIL) console.log('Uyarı: ADMIN_EMAIL tanımlı değil.');
  if (!mailTransport) console.log('Uyarı: SMTP/RESEND tanımlı değil.');
});
