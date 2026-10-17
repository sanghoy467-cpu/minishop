/* =========================================================
   삼환 물류(주) — 상품 데이터 (화폐 18종)

   동전과 지폐(구권 · 신권) 수집용 상품입니다.
   이 파일은 Supabase 연결이 안 될 때만 쓰이는 예비 데이터이고,
   평소에는 products 테이블에서 받아온 값으로 덮어씁니다.

   image : 자유 이용 라이선스 이미지의 외부 링크
           · images.rawpixel.com  — Rawpixel (CC0 / Public Domain)
           · cdn.stocksnap.io     — StockSnap (CC0)
   price : 정가(원) / discount : 할인율(%) / 판매가는 app.js 에서 계산
   emoji : 이미지 로딩 실패 시 보여줄 대체 썸네일용 이모지
   ========================================================= */

var PRODUCTS = [
  {
    id: 1,
    name: "1861년 미국 5달러 대형 구권",
    category: "지폐·구권",
    brand: "고전화폐사",
    price: 1850000,
    discount: 18,
    rating: 4.9,
    reviews: 142,
    flag: "BEST",
    emoji: "💵",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drMjUxODMwMzMtaW1hZ2UuanBn.jpg"
  },
  {
    id: 2,
    name: "1862년 미국 50달러 대형 구권",
    category: "지폐·구권",
    brand: "고전화폐사",
    price: 3200000,
    discount: 15,
    rating: 4.8,
    reviews: 87,
    flag: "BEST",
    emoji: "💵",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drMzM0MjIxMjgtaW1hZ2UuanBn.jpg"
  },
  {
    id: 3,
    name: "1926년 프랑스 1000프랑 구권",
    category: "지폐·구권",
    brand: "고전화폐사",
    price: 680000,
    discount: 25,
    rating: 4.7,
    reviews: 213,
    flag: "",
    emoji: "💶",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTEwL3BkbWlzYzYtd2szMDU5OTkzNS0wMS1pbWFnZV8xLmpwZw.jpg"
  },
  {
    id: 4,
    name: "남부연합 5·100달러 구권 2매 세트",
    category: "지폐·구권",
    brand: "고전화폐사",
    price: 1240000,
    discount: 22,
    rating: 4.6,
    reviews: 96,
    flag: "",
    emoji: "📜",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJiaWxsc19jb25mZWRlcmF0ZV9zdGF0ZXNfYW1lcmljYS1pbWFnZS1reWJlOHpvZC5qcGc.jpg"
  },
  {
    id: 5,
    name: "1909년 독일 제국은행권 100마르크",
    category: "지폐·구권",
    brand: "고전화폐사",
    price: 145000,
    discount: 30,
    rating: 4.7,
    reviews: 458,
    flag: "",
    emoji: "📜",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyYmFua19ub3RlX2ltcGVyaWFsX2Jhbmtub3RlXzItaW1hZ2Uta3liYzdkOGEuanBn.jpg"
  },
  {
    id: 6,
    name: "독일 제국은행권 구권 모음 5매",
    category: "지폐·구권",
    brand: "고전화폐사",
    price: 390000,
    discount: 28,
    rating: 4.8,
    reviews: 301,
    flag: "BEST",
    emoji: "📜",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJtb25leV9kb2xsYXJfYmlsbF9iaWxscy1pbWFnZS1reWJkN25uaS5qcGc.jpg"
  },
  {
    id: 7,
    name: "1928년 미국 5달러 소형 신권",
    category: "지폐·신권",
    brand: "프리미엄노트",
    price: 920000,
    discount: 20,
    rating: 4.8,
    reviews: 176,
    flag: "",
    emoji: "💵",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drMjQ4ODcyMzctaW1hZ2UuanBn.jpg"
  },
  {
    id: 8,
    name: "미국 1달러 신권 미사용 연번호",
    category: "지폐·신권",
    brand: "프리미엄노트",
    price: 38000,
    discount: 26,
    rating: 4.5,
    reviews: 1204,
    flag: "NEW",
    emoji: "💵",
    image: "https://cdn.stocksnap.io/img-thumbs/960w/HHH84SKFXQ.jpg"
  },
  {
    id: 9,
    name: "미국 달러 신권 묶음 20매",
    category: "지폐·신권",
    brand: "프리미엄노트",
    price: 185000,
    discount: 24,
    rating: 4.6,
    reviews: 642,
    flag: "",
    emoji: "💵",
    image: "https://cdn.stocksnap.io/img-thumbs/960w/RG4XMMLSNU.jpg"
  },
  {
    id: 10,
    name: "유로 10유로 신권 10매 연번호",
    category: "지폐·신권",
    brand: "프리미엄노트",
    price: 235000,
    discount: 21,
    rating: 4.7,
    reviews: 388,
    flag: "NEW",
    emoji: "💶",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZybW9uZXlfZXVyb3NfYmFua25vdGVzX2JpbGxzXzAtaW1hZ2Uta3liZDcwZGQuanBn.jpg"
  },
  {
    id: 11,
    name: "유로 고액권 200·500 세트",
    category: "지폐·신권",
    brand: "프리미엄노트",
    price: 1480000,
    discount: 12,
    rating: 4.9,
    reviews: 154,
    flag: "",
    emoji: "💶",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZybW9uZXlfc2VlbV9ldXJvX2JpbGxzXzQtaW1hZ2Uta3liYjJwZ3UuanBn.jpg"
  },
  {
    id: 12,
    name: "1807년 미국 5달러 금화",
    category: "금화",
    brand: "삼환화폐",
    price: 4800000,
    discount: 10,
    rating: 5.0,
    reviews: 63,
    flag: "BEST",
    emoji: "🪙",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drNDI4MTYxMDMtaW1hZ2UuanBn.jpg"
  },
  {
    id: 13,
    name: "프랑스 20프랑 세레스 금화",
    category: "금화",
    brand: "삼환화폐",
    price: 1120000,
    discount: 16,
    rating: 4.8,
    reviews: 227,
    flag: "",
    emoji: "🪙",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvZmlsZXMvd2Vic2l0ZS8yMDIyLTExL3drNzk2ODk0OTYtaW1hZ2UuanBn.jpg"
  },
  {
    id: 14,
    name: "로마 트라야누스 금화 아우레우스",
    category: "고대주화",
    brand: "삼환화폐",
    price: 6500000,
    discount: 8,
    rating: 5.0,
    reviews: 41,
    flag: "BEST",
    emoji: "🏛️",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drODAzOTgwMTYtaW1hZ2UuanBn.jpg"
  },
  {
    id: 15,
    name: "로마 하드리아누스 청동화",
    category: "고대주화",
    brand: "삼환화폐",
    price: 740000,
    discount: 19,
    rating: 4.7,
    reviews: 118,
    flag: "",
    emoji: "🏛️",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drODAxNDQ3NDMtaW1hZ2UuanBn.jpg"
  },
  {
    id: 16,
    name: "빅토리아 여왕 즉위 60주년 기념 금메달",
    category: "기념주화",
    brand: "월드코인",
    price: 2850000,
    discount: 14,
    rating: 4.9,
    reviews: 72,
    flag: "",
    emoji: "🏅",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA5L21ldDE5MDU0OC1pbWFnZS5qcGc.jpg"
  },
  {
    id: 17,
    name: "나폴레옹 3세 만국박람회 기념 은메달",
    category: "기념주화",
    brand: "월드코인",
    price: 560000,
    discount: 23,
    rating: 4.6,
    reviews: 165,
    flag: "",
    emoji: "🏅",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmwzOTQ3NzMxNjU1MS1pbWFnZS1reWNqNHpweS5qcGc.jpg"
  },
  {
    id: 18,
    name: "세계 각국 주화 30종 컬렉션",
    category: "세계주화",
    brand: "월드코인",
    price: 128000,
    discount: 35,
    rating: 4.5,
    reviews: 892,
    flag: "NEW",
    emoji: "🌏",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTI0NzI3OS1pbWFnZS1rd3lxdHkzZy5qcGc.jpg"
  }
];
