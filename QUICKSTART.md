# 🚀 빠른 시작 가이드

## 1️⃣ 즉시 사용 (추천)

1. `google-maps-photo-maker.html` 파일을 더블클릭하여 브라우저에서 열기
2. "⚡ 샘플 데이터 불러오기" 버튼 클릭
3. 사진 업로드
4. 완성! 이미지 저장

**이 방법이 가장 간단하고 빠릅니다!**

---

## 2️⃣ 구글 지도 링크 자동 연동 (선택사항)

구글 지도 링크에서 자동으로 정보를 가져오려면:

### 준비물
- Node.js 설치 필요 (https://nodejs.org/)
- Google Cloud 계정 (무료)

### 설정 방법

#### Step 1: Google Places API 키 발급
```bash
1. https://console.cloud.google.com/ 접속
2. 새 프로젝트 생성
3. "API 및 서비스" → "Places API" 활성화
4. "사용자 인증 정보" → API 키 생성
```

#### Step 2: 서버 설정
```bash
# 패키지 설치
npm install

# .env 파일 생성 (.env.example 복사)
cp .env.example .env

# .env 파일 편집하여 API 키 입력
# GOOGLE_PLACES_API_KEY=여기에_발급받은_키_입력
```

#### Step 3: 서버 실행
```bash
npm start
```

서버가 http://localhost:3001 에서 실행됩니다.

#### Step 4: HTML 파일 수정

`google-maps-photo-maker.html` 파일에서 API 호출 부분을 찾아 수정:

**찾을 코드:**
```javascript
const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?...`
);
```

**변경할 코드:**
```javascript
const response = await fetch(
    `http://localhost:3001/api/place/${placeId}`
);
```

---

## 💡 추천 사용 방법

대부분의 사용자는 **방법 1 (즉시 사용)**을 권장합니다:
- 설정 불필요
- 서버 필요 없음
- 정보를 한 번만 복사-붙여넣기하면 됨
- 구글 API 비용 걱정 없음

**방법 2 (자동 연동)**은 다음과 같은 경우에 유용합니다:
- 많은 장소를 자동으로 처리하고 싶을 때
- 실시간 정보 업데이트가 필요할 때
- 개발자 도구에 익숙한 경우

---

## 🆘 문제 해결

### Q: 이미지가 저장되지 않아요
A: 브라우저의 팝업 차단을 해제해주세요

### Q: 사진이 너무 어둡게 나와요
A: 밝은 조명에서 찍은 사진을 사용해주세요

### Q: API 키 발급이 어려워요
A: 방법 1을 사용하세요! API 없이도 완벽하게 작동합니다

### Q: 구글 지도와 100% 똑같나요?
A: 네! Roboto 폰트와 정확한 색상, 레이아웃을 사용했습니다

---

## 📱 모바일에서 사용하기

1. HTML 파일을 구글 드라이브에 업로드
2. 모바일에서 드라이브 접속
3. HTML 파일 열기 (브라우저에서)
4. 모바일 갤러리에서 사진 업로드

---

**즐거운 인증샷 만들기 되세요! 📍✨**
