# 동마중 급식 서버

## 파일 구조

```
dongma-lunch/
├── server.js          ← Node.js 백엔드 서버
├── package.json
├── votes.db           ← SQLite DB (자동 생성)
└── public/
    └── index.html     ← 프론트엔드
```

## 로컬 실행

```bash
npm install
node server.js
# → http://localhost:3000 접속
```

## 호스팅 (Railway 기준 - 무료)

1. https://railway.app 회원가입
2. New Project → Deploy from GitHub → 이 폴더를 GitHub에 올린 뒤 연결
3. 배포 완료 후 생성된 도메인 확인 (예: https://dongma.up.railway.app)
4. public/index.html 맨 위 API_BASE 수정:
   ```js
   const API_BASE = '';  // 같은 서버 서빙이면 빈 문자열 유지
   ```

## 호스팅 (Render 기준 - 무료)

1. https://render.com 회원가입
2. New → Web Service → GitHub 연결
3. Start Command: `node server.js`
4. 자동 배포 완료

## 투표 조작 방지 방식

- 각 기기에 `localStorage`로 고유 voter_id 발급 (재방문해도 유지)
- 서버 DB에서 (날짜, voter_id) 조합으로 중복 투표 차단
- 이미 투표한 voter_id가 다시 요청하면 DB에서 무시
- 버튼은 투표 즉시 비활성화, 재접속 시에도 내 투표 상태 서버에서 복원
