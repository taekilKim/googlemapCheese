# ⚡ 5분 만에 웹 배포하기

## 🎯 Vercel로 배포 (가장 쉬운 방법)

### 1️⃣ Google Maps API 키 발급 (3분)

```
1. https://console.cloud.google.com 접속
2. 새 프로젝트 만들기
3. "API 및 서비스 → 라이브러리" → "Places API" 검색 → 활성화
4. "사용자 인증 정보" → "API 키 만들기" → 복사
```

📘 **자세한 가이드**: `SETUP_GUIDE.md` 참고

---

### 2️⃣ Vercel 배포 (2분)

#### A. 원클릭 배포 버튼 (제일 쉬움!)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FtaekilKim%2FgooglemapCheese&env=GOOGLE_MAPS_API_KEY&envDescription=Google%20Maps%20API%20Key%20from%20Google%20Cloud%20Console&project-name=google-maps-photo-maker&repository-name=google-maps-photo-maker)

1. 위 버튼 클릭
2. GitHub 계정으로 로그인
3. 환경 변수에 API 키 입력
4. "Deploy" 클릭
5. 완료! 🎉

#### B. 수동 배포

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 로그인
vercel login

# 3. 배포
vercel

# 4. 환경 변수 설정
vercel env add GOOGLE_MAPS_API_KEY

# 5. 프로덕션 배포
vercel --prod
```

---

### 3️⃣ 배포 완료!

배포 후 받은 URL (예: `https://your-project.vercel.app`)로 접속하세요!

---

## 🔐 배포 후 필수 설정 (1분)

### API 키 보안 설정

배포 완료 **즉시** 설정하세요!

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **API 키 편집**
   - 생성한 API 키 옆의 연필 아이콘 클릭

3. **애플리케이션 제한사항**
   - "HTTP 리퍼러(웹사이트)" 선택
   - 웹사이트 제한사항 추가:
     ```
     https://your-project.vercel.app/*
     https://*.vercel.app/*
     ```

4. **API 제한사항**
   - "키 제한" 선택
   - "Places API"만 체크

5. **저장**

---

## ✅ 테스트

1. 배포된 사이트 접속
2. 구글 지도에서 아무 장소 검색 → 공유 → 링크 복사
3. 사이트에 링크 붙여넣기 → "장소 정보 가져오기"
4. 사진 업로드 → 저장
5. 성공! 🎉

---

## 🚀 다른 플랫폼 배포

### Railway
```bash
# 1. Railway 사이트 접속
https://railway.app

# 2. GitHub 연동
# 3. 환경 변수 설정: GOOGLE_MAPS_API_KEY
# 4. 자동 배포
```

### Netlify
```bash
# 1. Netlify 사이트 접속
https://www.netlify.com

# 2. GitHub 저장소 선택
# 3. 환경 변수 설정
# 4. 배포
```

### Docker (AWS, GCP, Azure 등)
```bash
# 1. Docker 이미지 빌드
docker build -t googlemaps-photo-maker .

# 2. 실행
docker run -p 3000:3000 \
  -e GOOGLE_MAPS_API_KEY=your_api_key \
  googlemaps-photo-maker
```

---

## 💰 비용

### 완전 무료!
- ✅ Vercel 무료 플랜: 충분함
- ✅ Google Maps API: 매월 $200 무료 크레딧 = 11,700회 무료
- ✅ 일반 개인 사용: 절대 유료 전환 안 됨

---

## 🆘 문제 해결

### "서버 연결 오류"
→ Vercel 대시보드에서 배포 로그 확인

### "API 키 오류"
→ Vercel 환경 변수가 제대로 설정되었는지 확인

### "장소를 찾을 수 없습니다"
→ Places API가 활성화되었는지 확인

---

## 📚 더 자세한 가이드

- **API 키 발급**: `SETUP_GUIDE.md`
- **배포 상세**: `DEPLOYMENT.md`
- **프로젝트 설명**: `README.md`

---

**🎉 완료! 이제 전 세계 누구나 사용할 수 있는 웹 서비스입니다!**
