# 상호상회 (Sangho Market) 🍳

주방용품 전문 **미니 쇼핑몰** 데모입니다.
별도의 빌드 도구나 서버 없이 `index.html` 하나만 열면 바로 동작합니다.

## 기능

| 기능 | 설명 |
|---|---|
| 🔐 로그인 | 아이디 · 비밀번호만 입력하면 입장 (데모용, 브라우저에만 저장) |
| 🛍 상품 30종 | 주방용품 30개 · 카테고리 7종 · 할인율 18~45% |
| ❤️ 찜하기 | 카드의 하트 버튼으로 찜 · 찜한 상품만 모아보기 |
| 🛒 장바구니 | 수량 조절 · 삭제 · 할인금액/배송비 자동 계산 (5만원 이상 무료배송) |
| 🔍 검색 · 필터 | 상품명/브랜드 검색, 카테고리 필터, 5가지 정렬 |
| 💾 저장 | 로그인 · 찜 · 장바구니 모두 `localStorage` 에 유지 |

## 실행

```bash
git clone https://github.com/sanghoy467-cpu/minishop.git
cd minishop
start index.html     # Windows
```

또는 `index.html` 파일을 더블클릭하세요.

## 파일 구성

```
minishop/
├─ index.html     마크업 (로그인 게이트 · 헤더 · 히어로 · 상품 그리드 · 드로어)
├─ styles.css     디자인 시스템 (주방 톤의 구리/크림 팔레트, 반응형)
├─ products.js    상품 데이터 30종
├─ app.js         로그인 · 찜 · 장바구니 · 검색/정렬 로직
└─ README.md
```

## 이미지 라이선스

상품 이미지는 모두 **자유 이용(CC0 / Public Domain) 라이선스** 이미지를 외부 링크로 사용합니다.

- [StockSnap.io](https://stocksnap.io) — CC0
- [Rawpixel](https://www.rawpixel.com) — CC0 / Public Domain
- 배경 이미지: [Unsplash](https://unsplash.com) — Unsplash License

이미지 로딩에 실패하면 자동으로 이모지 썸네일로 대체됩니다.

## 참고

포트폴리오 · 학습용 데모입니다. 실제 결제와 배송은 이루어지지 않으며,
로그인은 입력값 검증만 수행할 뿐 실제 인증 서버를 사용하지 않습니다.
