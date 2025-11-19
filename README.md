# 🗺️ 구글 지도 인증샷 메이커

구글 지도 링크와 사진으로 인스타그램용 인증샷을 쉽게 만들 수 있는 웹 서비스입니다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FtaekilKim%2FgooglemapCheese&env=GOOGLE_MAPS_API_KEY&envDescription=Google%20Maps%20API%20Key%20from%20Google%20Cloud%20Console&project-name=google-maps-photo-maker&repository-name=google-maps-photo-maker)

![Demo](https://via.placeholder.com/800x600?text=Demo+Screenshot)

> **⚡ 빠른 배포**: 위의 "Deploy with Vercel" 버튼을 클릭하면 2분 안에 배포 가능!

## ✨ 주요 기능

- 🔗 **구글 지도 링크 자동 파싱** - 링크만 붙여넣으면 장소 정보 자동 추출
- 🎨 **완벽한 구글 지도 UI** - Roboto 폰트와 정확한 색상으로 실제 UI 재현
- 📸 **사진 오버랩 레이아웃** - 사진 하단에 구글 지도 카드가 자연스럽게 오버랩
- 💾 **고해상도 저장** - 2배 스케일로 선명한 이미지 다운로드
- 🔒 **안전한 API 키 관리** - 백엔드 서버에서 API 키 보호

## 🌐 웹 배포 (추천)

**⚡ 5분 만에 무료로 웹에 배포하세요!**

### 방법 1: Vercel 원클릭 배포 (가장 쉬움)

1. 위의 **"Deploy with Vercel"** 버튼 클릭
2. GitHub 계정으로 로그인
3. Google Maps API 키 입력 ([발급 방법은 SETUP_GUIDE.md 참고](SETUP_GUIDE.md))
4. "Deploy" 클릭
5. 완료! URL 받아서 접속 🎉

### 방법 2: 다른 플랫폼

- **Railway**: https://railway.app - 500시간/월 무료
- **Netlify**: https://netlify.com - 무료 플랜
- **Render**: https://render.com - 무료 플랜

📘 **상세 가이드**: [DEPLOYMENT.md](DEPLOYMENT.md) 참고
⚡ **빠른 가이드**: [QUICK_DEPLOY.md](QUICK_DEPLOY.md) 참고

---

## 🚀 로컬 개발

### 1. 설치

```bash
# 저장소 클론
git clone <repository-url>
cd googlemapCheese

# 패키지 설치
npm install
```

### 2. Google Maps API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)에 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **"라이브러리"** 메뉴에서 다음 API 활성화:
   - Places API
   - Maps JavaScript API (선택사항)
4. **"사용자 인증 정보"** 메뉴에서 **"API 키 만들기"** 클릭
5. API 키 복사

### 3. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 열어서 API 키 입력
# GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### 4. 서버 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다!

## 📖 사용 방법

### Step 1: 구글 지도에서 링크 복사

1. 구글 지도 앱 또는 웹사이트에서 원하는 장소 검색
2. 장소를 클릭하여 정보 패널 열기
3. **"공유"** 버튼 클릭 → **"링크 복사"**

지원하는 링크 형식:
- `https://maps.google.com/maps?q=place_id:ChIJ...`
- `https://www.google.com/maps/place/스타벅스/@37.123,127.456...`
- `https://goo.gl/maps/xxxxx` (단축 URL)
- `https://maps.app.goo.gl/xxxxx`

### Step 2: 웹사이트에서 인증샷 생성

1. `http://localhost:3000` 접속
2. 복사한 구글 지도 링크 붙여넣기
3. **"🔍 장소 정보 가져오기"** 버튼 클릭
4. 사진 업로드 (드래그 앤 드롭 또는 클릭)
5. 미리보기 확인
6. **"💾 이미지로 저장하기"** 버튼 클릭

### Step 3: 인스타그램 공유

1. 다운로드한 이미지를 인스타그램 스토리 또는 피드에 업로드
2. 필터나 스티커 추가 (선택사항)
3. 공유!

## 🏗️ 프로젝트 구조

```
googlemapCheese/
├── server.js           # Express 백엔드 서버
├── index.html          # 프론트엔드 UI
├── package.json        # Node.js 의존성
├── .env                # 환경 변수 (git 제외)
├── .env.example        # 환경 변수 예제
├── .gitignore          # Git 제외 파일 목록
└── README.md           # 이 파일
```

## 🔧 API 엔드포인트

### `POST /api/place-from-url`

구글 지도 URL에서 장소 정보를 추출합니다.

**요청:**
```json
{
  "url": "https://maps.google.com/..."
}
```

**응답:**
```json
{
  "success": true,
  "place": {
    "name": "스타벅스 강남역점",
    "rating": 4.2,
    "user_ratings_total": 1234,
    "formatted_address": "서울특별시 강남구 강남대로 123",
    "types": ["cafe", "food", "store"],
    "geometry": { ... }
  }
}
```

### `GET /health`

서버 상태 확인

**응답:**
```json
{
  "status": "ok",
  "apiKeyConfigured": true
}
```

## 💰 비용

Google Maps API는 **무료 크레딧**을 제공합니다:
- 매월 $200 무료 크레딧
- Places API Details 요청: $0.017/건
- **약 11,700회 무료 사용 가능**

일반적인 개인 사용에는 무료 범위 내에서 충분합니다!

## 🔒 보안

- ✅ API 키는 `.env` 파일에 저장되며 Git에 커밋되지 않음
- ✅ 백엔드 서버에서만 API 키 사용
- ✅ 클라이언트 측 코드에 API 키 노출 안 됨
- ✅ CORS 설정으로 허용된 도메인만 접근 가능

### API 키 보호 권장 사항

1. **HTTP Referrer 제한** 설정:
   ```
   Google Cloud Console → API 키 → 애플리케이션 제한사항
   → HTTP 리퍼러 → https://yourdomain.com/*
   ```

2. **일일 할당량 제한**:
   ```
   Google Cloud Console → API 키 → API 제한사항
   → Places API → 할당량: 100 요청/일
   ```

3. **사용량 모니터링**:
   - Google Cloud Console에서 정기적으로 사용량 확인
   - 비정상적인 급증 시 알림 설정

## 🚀 배포

### Vercel / Netlify (서버리스)

서버리스 환경에서는 API 라우트를 사용해야 합니다. `server.js`를 서버리스 함수로 변환하거나, Vercel의 경우:

```bash
# vercel.json 생성
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" }
  ]
}
```

### Heroku

```bash
# Heroku CLI 설치 후
heroku create your-app-name
heroku config:set GOOGLE_MAPS_API_KEY=your_api_key
git push heroku main
```

### AWS EC2 / DigitalOcean

```bash
# PM2로 프로세스 관리
npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```

## 🐛 문제 해결

### "API 키가 설정되지 않았습니다" 오류

```bash
# .env 파일이 있는지 확인
cat .env

# API 키가 올바르게 설정되어 있는지 확인
# GOOGLE_MAPS_API_KEY=AIza... (실제 키)

# 서버 재시작
npm start
```

### "장소를 찾을 수 없습니다" 오류

- 구글 지도에서 **장소를 선택한 후**의 URL을 복사했는지 확인
- 검색 결과 URL이 아닌, 장소 상세 페이지 URL이어야 함
- 단축 URL(`goo.gl`)을 사용하거나, 전체 URL 사용

### CORS 오류

- 서버가 `http://localhost:3000`에서 실행 중인지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- `server.js`의 CORS 설정 확인

## 📝 라이선스

MIT License

## 🙏 크레딧

- [Google Maps Platform](https://developers.google.com/maps)
- [html2canvas](https://html2canvas.hertzen.com/)
- [Express.js](https://expressjs.com/)

## 📮 문의

이슈가 있으시면 GitHub Issues에 등록해주세요!
