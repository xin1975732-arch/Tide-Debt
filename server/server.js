const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'weitu-comments.db');
const ADMIN_KEY = (process.env.ADMIN_KEY || '').trim();
const PUBLIC_API = (process.env.PUBLIC_API || '').replace(/\/$/, '');

const isConfigured = Boolean(DB_PATH && PUBLIC_API && ADMIN_KEY);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initDb() {
  ensureDir(path.dirname(DB_PATH));
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(function() {
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id TEXT NOT NULL,
        chapter_id TEXT NOT NULL,
        paragraph_id TEXT,
        type TEXT NOT NULL DEFAULT 'paragraph',
        parent_id INTEGER,
        nickname TEXT NOT NULL,
        email TEXT,
        content TEXT NOT NULL,
        quote_text TEXT,
        status TEXT NOT NULL DEFAULT 'approved',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_comments_lookup ON comments(book_id, chapter_id, type, paragraph_id, status)');
  });
  return db;
}

const db = initDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

function sanitizeComment(data, bookIdFromRoute) {
  var nickname = String(data.nickname || '读者').slice(0, 24).trim();
  var email = String(data.email || '').slice(0, 64).trim();
  var content = String(data.content || '').slice(0, 500).trim();
  var quoteText = String(data.quoteText || '').slice(0, 300).trim();
  var type = ['paragraph', 'chapter', 'review'].indexOf(String(data.type || 'paragraph')) >= 0 ? String(data.type || 'paragraph') : 'paragraph';
  var bookId = String(data.bookId || bookIdFromRoute || '').slice(0, 120).trim();
  var chapterId = String(data.chapterId || '').slice(0, 120).trim();
  var paragraphId = String(data.paragraphId || '').slice(0, 120).trim();

  if (!nickname || !content || !bookId || !chapterId) {
    throw new Error('缺少必要字段：nickname、content、bookId、chapterId');
  }

  return {
    bookId: bookId,
    chapterId: chapterId,
    paragraphId: paragraphId || null,
    type: type,
    nickname: nickname,
    email: email || null,
    content: content,
    quoteText: quoteText || null,
    status: 'approved'
  };
}

function requireAdmin(req, res, next) {
  var header = req.get('x-admin-key') || req.get('authorization') || '';
  var token = String(header).replace(/^Bearer\s+/i, '');
  if (!ADMIN_KEY || token !== ADMIN_KEY) {
    return res.status(401).json({ message: '管理员认证失败' });
  }
  next();
}

app.get('/health', function(req, res) {
  res.json({ ok: true, configured: isConfigured, message: isConfigured ? '服务已配置' : '服务尚未配置' });
});

app.get('/api/config', function(req, res) {
  res.json({
    configured: isConfigured,
    apiBase: PUBLIC_API || '未配置',
    message: isConfigured ? '评论服务已启用' : '评论服务尚未配置',
    note: '未配置时，请在 .env 中填入 PUBLIC_API、DB_PATH、ADMIN_KEY。'
  });
});

app.get('/api/books/:bookId/comments', function(req, res) {
  if (!isConfigured) {
    return res.status(503).json({ message: '评论服务尚未配置' });
  }

  var bookId = req.params.bookId;
  var chapterId = req.query.chapterId || null;
  var paragraphId = req.query.paragraphId || null;
  var type = req.query.type || 'paragraph';

  var sql = 'SELECT * FROM comments WHERE book_id = ? AND type = ?';
  var params = [bookId, type];
  if (chapterId) {
    sql += ' AND chapter_id = ?';
    params.push(chapterId);
  }
  if (paragraphId) {
    sql += ' AND paragraph_id = ?';
    params.push(paragraphId);
  }
  sql += ' ORDER BY created_at ASC LIMIT 200';

  db.all(sql, params, function(err, rows) {
    if (err) {
      return res.status(500).json({ message: '查询评论失败', error: String(err) });
    }
    var items = (rows || []).map(function(row) {
      return {
        id: row.id,
        nickname: row.nickname,
        email: row.email || '',
        content: row.content,
        quoteText: row.quote_text,
        createdAt: row.created_at,
        status: row.status
      };
    });
    res.json({ items: items });
  });
});

app.post('/api/books/:bookId/comments', function(req, res) {
  if (!isConfigured) {
    return res.status(503).json({ message: '评论服务尚未配置' });
  }

  try {
    var payload = sanitizeComment(req.body, req.params.bookId);
    db.run(
      'INSERT INTO comments (book_id, chapter_id, paragraph_id, type, nickname, email, content, quote_text, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [payload.bookId, payload.chapterId, payload.paragraphId, payload.type, payload.nickname, payload.email, payload.content, payload.quoteText, payload.status],
      function(err) {
        if (err) {
          return res.status(500).json({ message: '保存评论失败', error: String(err) });
        }
        res.status(201).json({ ok: true, id: this.lastID, status: payload.status });
      }
    );
  } catch (error) {
    return res.status(400).json({ message: error.message || '提交失败' });
  }
});

app.get('/api/admin/comments', requireAdmin, function(req, res) {
  db.all('SELECT * FROM comments ORDER BY created_at DESC LIMIT 200', function(err, rows) {
    if (err) {
      return res.status(500).json({ message: '查询失败', error: String(err) });
    }
    res.json({ items: rows || [] });
  });
});

app.post('/api/admin/comments/:id/approve', requireAdmin, function(req, res) {
  var id = Number(req.params.id);
  db.run('UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['approved', id], function(err) {
    if (err) {
      return res.status(500).json({ message: '审核失败', error: String(err) });
    }
    res.json({ ok: true, changed: this.changes });
  });
});

app.delete('/api/admin/comments/:id', requireAdmin, function(req, res) {
  var id = Number(req.params.id);
  db.run('DELETE FROM comments WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ message: '删除失败', error: String(err) });
    }
    res.json({ ok: true, changed: this.changes });
  });
});

app.listen(PORT, function() {
  console.log('评论 API 运行中，端口:', PORT);
  console.log('服务配置状态:', isConfigured ? '已配置' : '未配置');
});
