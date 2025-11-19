# 📍 구글 지도 인증샷 메이커

구글 지도 링크만 붙여넣으면 자동으로 장소 정보를 가져와서 완벽한 인증샷을 만들어주는 웹 앱

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 주요 기능

- 🔥 **구글 지도 링크 자동 연동**: 링크만 붙여넣으면 장소 정보 자동 추출
- 🎨 **완벽한 구글 지도 UI**: 실제 구글 지도와 동일한 디자인
- 📱 **모바일 최적화**: 인스타그램에 바로 올릴 수 있는 세로 형태
- 💾 **고화질 저장**: 2배 해상도 PNG 다운로드
- 🔒 **개인정보 보호**: 모든 처리는 브라우저에서만 진행
- 💰 **무료 사용**: Google Places API 무료 크레딧 (월 11,700회)

## 🖼️ 스크린샷

```
┌─────────────────────────────┐
│                             │
│     📸 사진                 │
│                             │
│                             │
├─────────────────────────────┤
│ 📍 장소명                   │
│ ⭐ 4.8 ★★★★★ (466)         │
│ 🏷️ 카테고리                │
│ 💰 가격대                   │
│ 🕐 영업시간                 │
│ 📍 주소                     │
│                             │
│ [🧭 경로] [🚀 시작] [💾 저장] │
└─────────────────────────────┘
```

## 🚀 빠른 시작

### 1. Google Maps API 키 발급 (5분)

1. [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials) 접속
2. 새 프로젝트 생성
3. "Places API" 활성화
4. API 키 생성 및 복사

### 2. 앱 사용

1. `maps-photo-final.html` 파일을 브라우저에서 열기
2. API 키 입력 (최초 1회)
3. 구글 지도에서 링크 복사 → 붙여넣기
4. "🔍 장소 정보 자동으로 가져오기" 클릭
5. 사진 업로드
6. "💾 이미지 저장" 클릭

## 📂 프로젝트 구조

```
google-maps-photo-maker/
├── maps-photo-final.html          # 메인 앱 (이 파일만 있으면 작동!)
├── google-maps-photo-maker.html   # 수동 입력 버전
├── map-photo-generator.html       # 초기 버전
├── 사용가이드.md                  # 한국어 상세 가이드
├── QUICKSTART.md                  # 빠른 시작 가이드
├── README.md                      # 프로젝트 설명
├── server.js                      # (선택) API 프록시 서버
├── package.json                   # (선택) Node.js 설정
└── env.example                    # (선택) 환경 변수 예제
```

## 💡 사용 예시

### 카페 방문 기록
```javascript
1. 카페에서 사진 촬영 📸
2. 구글 지도에서 카페 검색 → 링크 복사 🔗
3. 앱에 붙여넣기 → "자동으로 가져오기" 클릭
   → 장소명: "스타벅스 강남역점"
   → 평점: 4.2 ⭐
   → 리뷰: 1,234개
   → 주소: 자동 입력
4. 사진 업로드 → 저장 💾
5. 인스타그램 스토리에 업로드! 🎉
```

## 🛠️ 기술 스택

- **Frontend**: React 18 (CDN)
- **Image Processing**: html2canvas
- **Font**: Google Fonts (Roboto)
- **API**: Google Places API
- **Styling**: Vanilla CSS

## 🔧 고급 설정 (선택사항)

### 프록시 서버 사용

CORS 문제를 해결하기 위해 자체 프록시 서버를 운영할 수 있습니다:

```bash
# 설치
npm install

# 환경 변수 설정
cp env.example .env
# .env 파일에 API 키 입력

# 서버 실행
npm start
```

## 💰 비용 안내

### Google Places API 무료 크레딧
- 매월 **$200** 무료 크레딧 제공
- Place Details 요청: **$0.017/회**
- 월 약 **11,700회** 무료 사용 가능

**일반 사용자는 완전 무료로 사용 가능합니다!** 🎁

## 🔐 개인정보 보호

- API 키는 **브라우저 localStorage**에만 저장
- **서버로 전송되지 않음**
- 모든 처리는 **클라이언트 사이드**에서 진행
- 사진은 **기기에만 저장**, 업로드 없음

## 🐛 문제 해결

### "API 키가 유효하지 않습니다" 오류
- Places API 활성화 확인
- Google Cloud Console에서 결제 정보 등록 (무료 크레딧 사용을 위해)

### "REQUEST_DENIED" 오류
- Places API가 프로젝트에서 활성화되었는지 확인
- API 키 제한 설정 확인

### 링크를 붙여넣었는데 정보가 안 나옴
- 구글 지도에서 **특정 장소를 선택한 후**의 링크 사용
- 올바른 형식: `https://maps.app.goo.gl/xxxxx` 또는 `https://www.google.com/maps/place/...`

자세한 내용은 [사용가이드.md](./사용가이드.md)를 참고하세요.

## 📱 모바일 사용

1. HTML 파일을 Google Drive/iCloud에 업로드
2. 모바일에서 드라이브 접속
3. HTML 파일 열기 (브라우저에서)
4. API 키 입력 후 사용

## 🎯 향후 계획

- [ ] 배치 처리 모드 (여러 장소 한번에)
- [ ] 다크 모드 지원
- [ ] 커스텀 테마
- [ ] 네이버 지도, 카카오맵 지원
- [ ] PWA 변환 (앱처럼 설치)
- [ ] 자동 SNS 공유

## 🤝 기여하기

버그 리포트, 기능 제안, PR 모두 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 💬 문의

- 이슈: [GitHub Issues](https://github.com/yourusername/google-maps-photo-maker/issues)
- 이메일: your.email@example.com

## 🌟 Star History

이 프로젝트가 도움이 되었다면 ⭐️ 를 눌러주세요!

---

**Made with ❤️ by [Your Name]**

🔗 [데모 보기](#) | 📖 [상세 가이드](./사용가이드.md) | 🚀 [빠른 시작](./QUICKSTART.md)
