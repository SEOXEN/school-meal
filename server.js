/**
 * 동마중 급식 투표 서버
 * 실행: node server.js
 * 의존성: npm install express better-sqlite3 cors
 */

const express    = require('express');
const Database   = require('better-sqlite3');
const cors       = require('cors');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── DB 초기화 ── */
const db = new Database(path.join(__dirname, 'votes.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    date     TEXT    NOT NULL,
    type     TEXT    NOT NULL CHECK(type IN ('like','dislike')),
    voter_id TEXT    NOT NULL,
    voted_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (date, voter_id)
  );
`);

/* ── 미들웨어 ── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); /* index.html 서빙 */

/* ── 투표 집계 조회 ── */
app.get('/api/votes/:date', (req, res) => {
  const { date } = req.params;

  const rows = db.prepare(`
    SELECT type, COUNT(*) as cnt
    FROM votes
    WHERE date = ?
    GROUP BY type
  `).all(date);

  const result = { likes: 0, dislikes: 0 };
  rows.forEach(r => {
    if (r.type === 'like')    result.likes    = r.cnt;
    if (r.type === 'dislike') result.dislikes = r.cnt;
  });

  res.json(result);
});

/* ── 내 투표 확인 ── */
app.get('/api/votes/:date/my', (req, res) => {
  const { date }     = req.params;
  const { voter_id } = req.query;

  if (!voter_id) return res.json({ vote: null });

  const row = db.prepare(`
    SELECT type FROM votes WHERE date = ? AND voter_id = ?
  `).get(date, voter_id);

  res.json({ vote: row ? row.type : null });
});

/* ── 투표 등록 / 취소 ── */
app.post('/api/votes/:date', (req, res) => {
  const { date }          = req.params;
  const { voter_id, type } = req.body;   /* type: 'like' | 'dislike' | null(취소) */

  if (!voter_id) {
    return res.status(400).json({ error: 'voter_id required' });
  }

  /* 날짜 형식 검증 (YYYYMMDD) */
  if (!/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: 'invalid date' });
  }

  if (type === null || type === undefined) {
    /* 투표 취소 */
    db.prepare(`DELETE FROM votes WHERE date = ? AND voter_id = ?`).run(date, voter_id);
    return res.json({ ok: true, action: 'removed' });
  }

  if (type !== 'like' && type !== 'dislike') {
    return res.status(400).json({ error: 'type must be like or dislike' });
  }

  /* 이미 투표한 경우 → 변경 허용 (같은 기기에서 like→dislike 변경)
     단, 프론트에서 한 번 투표 후 버튼 잠금하므로 실제로는 1회만 가능 */
  db.prepare(`
    INSERT INTO votes (date, type, voter_id)
    VALUES (?, ?, ?)
    ON CONFLICT(date, voter_id) DO UPDATE SET type = excluded.type,
                                               voted_at = strftime('%s','now')
  `).run(date, type, voter_id);

  /* 최신 집계 반환 */
  const rows = db.prepare(`
    SELECT type, COUNT(*) as cnt FROM votes WHERE date = ? GROUP BY type
  `).all(date);

  const result = { likes: 0, dislikes: 0 };
  rows.forEach(r => {
    if (r.type === 'like')    result.likes    = r.cnt;
    if (r.type === 'dislike') result.dislikes = r.cnt;
  });

  res.json({ ok: true, action: 'saved', ...result });
});

/* ── 서버 시작 ── */
app.listen(PORT, () => {
  console.log(`✅ 동마중 급식 서버 실행 중: http://localhost:${PORT}`);
});
