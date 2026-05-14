/**
 * 동마중 급식 투표 서버
 * DB 없이 JSON 파일로 투표 저장 → Node.js 어느 버전이든 호환
 * 의존성: npm install express cors
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── 데이터 파일 경로 ── */
const DATA_FILE = path.join(__dirname, 'votes.json');

/* ── JSON 읽기/쓰기 헬퍼 ── */
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  /* { [date]: { likes: 0, dislikes: 0, voters: { [voter_id]: 'like'|'dislike' } } } */
  return {};
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/* ── 미들웨어 ── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ── 투표 집계 조회 ── */
app.get('/api/votes/:date', (req, res) => {
  const { date } = req.params;
  const data = readData();
  const entry = data[date] || { likes: 0, dislikes: 0 };
  res.json({ likes: entry.likes || 0, dislikes: entry.dislikes || 0 });
});

/* ── 내 투표 확인 ── */
app.get('/api/votes/:date/my', (req, res) => {
  const { date }     = req.params;
  const { voter_id } = req.query;

  if (!voter_id) return res.json({ vote: null });

  const data   = readData();
  const entry  = data[date];
  const myVote = entry?.voters?.[voter_id] || null;

  res.json({ vote: myVote });
});

/* ── 투표 등록 ── */
app.post('/api/votes/:date', (req, res) => {
  const { date }           = req.params;
  const { voter_id, type } = req.body;

  if (!voter_id) return res.status(400).json({ error: 'voter_id required' });
  if (!/^\d{8}$/.test(date)) return res.status(400).json({ error: 'invalid date' });

  const data = readData();

  /* 해당 날짜 데이터 초기화 */
  if (!data[date]) {
    data[date] = { likes: 0, dislikes: 0, voters: {} };
  }

  const entry   = data[date];
  const prevType = entry.voters[voter_id] || null;

  /* 이미 투표한 경우 차단 (서버 이중 방어) */
  if (prevType) {
    return res.status(400).json({ error: 'already voted', vote: prevType });
  }

  /* 투표 취소 요청 */
  if (!type) {
    return res.json({ ok: true, action: 'none', likes: entry.likes, dislikes: entry.dislikes });
  }

  if (type !== 'like' && type !== 'dislike') {
    return res.status(400).json({ error: 'type must be like or dislike' });
  }

  /* 투표 반영 */
  entry.voters[voter_id] = type;
  if (type === 'like')    entry.likes    += 1;
  if (type === 'dislike') entry.dislikes += 1;

  writeData(data);

  res.json({ ok: true, action: 'saved', likes: entry.likes, dislikes: entry.dislikes });
});

/* ── 서버 시작 ── */
app.listen(PORT, () => {
  console.log(`✅ 동마중 급식 서버 실행 중: http://localhost:${PORT}`);
});
