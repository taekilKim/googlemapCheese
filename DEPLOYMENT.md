# 🚀 웹 배포 가이드

이 프로젝트를 무료로 웹에 배포하는 방법을 안내합니다.

---

## 🎯 추천 배포 플랫폼 비교

| 플랫폼 | 난이도 | 무료 플랜 | 서버리스 지원 | 추천도 |
|--------|--------|-----------|---------------|--------|
| **Vercel** | ⭐ 쉬움 | ✅ 넉넉함 | ✅ 완벽 | ⭐⭐⭐⭐⭐ |
| **Netlify** | ⭐ 쉬움 | ✅ 좋음 | ✅ 지원 | ⭐⭐⭐⭐ |
| **Railway** | ⭐⭐ 보통 | ✅ 500시간/월 | ✅ 지원 | ⭐⭐⭐⭐ |
| **Render** | ⭐⭐ 보통 | ⚠️ 제한적 | ✅ 지원 | ⭐⭐⭐ |
| **Heroku** | ⭐⭐⭐ 어려움 | ❌ 유료 전환 | ⚠️ 제한적 | ⭐⭐ |

**👉 추천: Vercel** (가장 쉽고 빠르며, 무료 플랜이 넉넉함)

---

## 🏆 방법 1: Vercel 배포 (추천)

### 준비물
- GitHub 계정
- Vercel 계정 (GitHub로 가입 가능)
- Google Maps API 키

### 1단계: 프로젝트를 GitHub에 푸시

이미 완료되어 있습니다! ✅
```
https://github.com/taekilKim/googlemapCheese
```

### 2단계: Vercel 계정 생성

1. **Vercel 접속**
   ```
   https://vercel.com
   ```

2. **GitHub로 회원가입**
   - "Sign Up" 클릭
   - "Continue with GitHub" 선택
   - GitHub 계정 연동 승인

### 3단계: 프로젝트 가져오기

1. **Vercel 대시보드에서 "Add New..." 클릭**
   - 우측 상단의 "Add New..." → "Project" 선택

2. **GitHub 저장소 선택**
   - "Import Git Repository" 섹션에서
   - `taekilKim/googlemapCheese` 찾기
   - **"Import"** 클릭

3. **프로젝트 설정**
   - **Framework Preset**: 자동 감지 (또는 "Other" 선택)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm install` (자동)
   - **Output Directory**: `public` 또는 비워두기
   - **Install Command**: `npm install` (자동)

### 4단계: 환경 변수 설정

1. **"Environment Variables" 섹션 펼치기**

2. **환경 변수 추가**
   ```
   Name: GOOGLE_MAPS_API_KEY
   Value: AIzaSy여기에_실제_API_키_붙여넣기
   ```
   - "Add" 버튼 클릭

3. **Production, Preview, Development 모두 체크**
   - 모든 환경에서 동일한 키 사용

### 5단계: 배포

1. **"Deploy" 버튼 클릭**
   - 배포 시작 (약 1-2분 소요)
   - 실시간 로그 확인 가능

2. **배포 완료**
   - 축하 메시지와 함께 URL 표시
   - 예시: `https://your-project-name.vercel.app`

3. **사이트 접속**
   - 제공된 URL 클릭
   - 바로 사용 가능! 🎉

### 6단계: 커스텀 도메인 연결 (선택사항)

1. **Vercel 대시보드 → Settings → Domains**

2. **도메인 추가**
   - 본인 소유 도메인 입력 (예: `mapphoto.com`)
   - DNS 설정 안내에 따라 설정

3. **자동 SSL 인증서**
   - Vercel이 자동으로 HTTPS 설정

---

## 🔧 Vercel 설정 파일 (자동 생성됨)

이미 `vercel.json` 파일이 프로젝트에 포함되어 있습니다:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

---

## ⚡ 방법 2: Netlify 배포

### 1단계: Netlify 계정 생성
```
https://www.netlify.com
```
- GitHub로 회원가입

### 2단계: 프로젝트 가져오기

1. **"Add new site" → "Import an existing project"**
2. **GitHub 연결 후 저장소 선택**
3. **빌드 설정**
   ```
   Build command: npm install
   Publish directory: public
   ```

### 3단계: 환경 변수 설정

1. **Site settings → Environment → Environment variables**
2. **변수 추가**
   ```
   Key: GOOGLE_MAPS_API_KEY
   Value: 여기에_API_키_붙여넣기
   ```

### 4단계: Functions 설정

Netlify는 serverless functions를 `netlify/functions/` 폴더에 넣어야 합니다.

**주의**: 이 프로젝트는 Express 서버를 사용하므로, Netlify Functions로 변환이 필요합니다.
→ **Vercel 사용을 더 추천합니다!**

---

## 🚂 방법 3: Railway 배포

### 특징
- GitHub 연동 쉬움
- 무료: 500시간/월 ($5 크레딧)
- 자동 HTTPS
- 데이터베이스 지원 (나중에 확장 시 유용)

### 배포 방법

1. **Railway 접속 및 가입**
   ```
   https://railway.app
   ```
   - GitHub로 회원가입

2. **"New Project" → "Deploy from GitHub repo"**
   - `googlemapCheese` 저장소 선택

3. **환경 변수 설정**
   - Variables 탭에서 추가
   ```
   GOOGLE_MAPS_API_KEY=여기에_API_키
   PORT=3000
   ```

4. **자동 배포**
   - Railway가 자동으로 감지 및 배포
   - URL 생성: `https://your-app.up.railway.app`

---

## 🐳 방법 4: Docker + 클라우드 배포 (고급)

### 장점
- 완전한 제어
- 어디든 배포 가능 (AWS, GCP, Azure, DigitalOcean)

### Dockerfile (이미 포함됨)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 배포 방법

1. **Docker Hub에 이미지 푸시**
   ```bash
   docker build -t yourusername/googlemaps-photo-maker .
   docker push yourusername/googlemaps-photo-maker
   ```

2. **클라우드 플랫폼에서 실행**
   - AWS ECS, Google Cloud Run, Azure Container Instances 등

---

## 🔐 배포 후 보안 설정

### 1. Google Maps API 키 제한 (필수!)

배포 완료 후 **즉시** API 키 제한을 설정하세요!

1. **Google Cloud Console → API 및 서비스 → 사용자 인증 정보**

2. **API 키 편집**

3. **애플리케이션 제한사항**
   - **"HTTP 리퍼러(웹사이트)"** 선택
   - 허용할 URL 추가:
     ```
     https://your-project-name.vercel.app/*
     https://www.yourdomain.com/*
     https://*.vercel.app/*  (모든 Vercel 프리뷰 배포)
     ```

4. **API 제한사항**
   - **"키 제한"** 선택
   - **"Places API"**만 체크

5. **저장**

### 2. 환경 변수 확인

- `.env` 파일이 Git에 커밋되지 않았는지 확인
- GitHub 저장소에서 `.env` 파일이 보이면 안 됨
- `.gitignore`에 `.env`가 포함되어 있는지 확인

### 3. CORS 설정 (필요 시)

`server.js`에서 특정 도메인만 허용:

```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'https://your-domain.com',
    'https://your-project.vercel.app'
  ]
}));
```

---

## 📊 배포 후 모니터링

### Vercel Analytics (무료)

1. **Vercel 대시보드 → Analytics 탭**
2. **실시간 방문자 확인**
3. **성능 메트릭 확인**

### Google Cloud Monitoring

1. **Google Cloud Console → API 대시보드**
2. **Places API 사용량 확인**
3. **예상 비용 확인**

### 알림 설정

- Google Cloud에서 예산 알림 설정
- 무료 크레딧 $200 중 50% 사용 시 이메일 알림

---

## 🚀 CI/CD 자동 배포

Vercel은 자동 배포를 지원합니다!

### 작동 방식
1. **코드 수정 후 GitHub에 푸시**
   ```bash
   git add .
   git commit -m "Update UI"
   git push
   ```

2. **Vercel이 자동으로 감지**
   - 새 커밋 감지
   - 자동 빌드 및 배포
   - 프리뷰 URL 생성 (PR인 경우)

3. **프로덕션 배포**
   - `main` 브랜치에 푸시하면 자동으로 프로덕션 배포
   - 다른 브랜치는 프리뷰 배포만

### GitHub Actions (선택사항)

더 복잡한 CI/CD가 필요하면 `.github/workflows/deploy.yml` 사용

---

## 💰 비용 계산

### Vercel 무료 플랜
- ✅ 월 100GB 대역폭
- ✅ 무제한 배포
- ✅ 자동 HTTPS
- ✅ 프리뷰 배포
- ✅ 상업적 사용 가능

### Google Maps API
- ✅ 매월 $200 무료 크레딧
- ✅ Places API: $0.017/건
- ✅ 약 11,700회/월 무료

### 예상 사용량
- 일일 방문자 100명 × 월 30일 = 3,000건
- **비용: $0** (무료 범위 내)

---

## ⚠️ 문제 해결

### "서버 연결 오류" 메시지
→ Vercel 배포 로그 확인 (`/deploys` 페이지)

### "API 키 오류"
→ Vercel 환경 변수가 올바르게 설정되었는지 확인

### "404 Not Found"
→ `vercel.json` 파일 확인 및 재배포

### 배포는 성공했지만 API 호출 실패
→ Google Cloud Console에서 API 활성화 확인

---

## 🎉 배포 완료 체크리스트

- [ ] Vercel 계정 생성
- [ ] GitHub 저장소 연동
- [ ] 환경 변수 설정 (`GOOGLE_MAPS_API_KEY`)
- [ ] 배포 성공 및 URL 확인
- [ ] Google Maps API 키 HTTP 리퍼러 제한 설정
- [ ] 실제 구글 지도 링크로 테스트
- [ ] 사진 업로드 및 다운로드 테스트
- [ ] 모바일 환경에서 테스트
- [ ] Google Cloud 예산 알림 설정
- [ ] 사용량 모니터링 설정

---

**🚀 이제 전 세계 누구나 접속할 수 있는 웹 서비스가 되었습니다!**

**서비스 공유하기**:
- 인스타그램 스토리에 URL 공유
- 카카오톡으로 링크 전송
- 블로그/커뮤니티에 소개

**다음 단계**:
- 커스텀 도메인 연결
- Google Analytics 추가
- SEO 최적화
- 소셜 미디어 공유 기능 강화
