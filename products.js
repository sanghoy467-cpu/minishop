/* =========================================================
   상호상회 — 상품 데이터 (주방용품 믹서기 13종)

   이 파일은 Supabase 연결이 안 될 때만 쓰이는 예비 데이터입니다.
   평소에는 products 테이블에서 받아온 값으로 덮어씁니다.

   image : 자유 이용 라이선스 이미지의 외부 링크
           · images.rawpixel.com  — Rawpixel (CC0 / Public Domain)
           · cdn.stocksnap.io     — StockSnap (CC0)
           · images.unsplash.com  — Unsplash License
   price : 정가(원) / discount : 할인율(%) / 판매가는 app.js 에서 계산
   emoji : 이미지 로딩 실패 시 보여줄 대체 썸네일용 이모지
   ========================================================= */

var PRODUCTS = [
  {
    id: 1,
    name: "프로 고속 블렌더 1.5L 2200W",
    category: "고속블렌더",
    brand: "상호블렌드",
    price: 189000,
    discount: 38,
    rating: 4.9,
    reviews: 2341,
    flag: "BEST",
    emoji: "🥤",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDQyOS1oZWFsdGh5LXNtb290aGllLWluZ3JlZGllbnRzLmpwZw.jpg"
  },
  {
    id: 2,
    name: "진공 고속 블렌더 1.2L 산화방지",
    category: "고속블렌더",
    brand: "상호블렌드",
    price: 234000,
    discount: 42,
    rating: 4.8,
    reviews: 1128,
    flag: "BEST",
    emoji: "🥤",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDM1OC1oZWFsdGh5LXNtb290aGllLWluZ3JlZGllbnRzMS5qcGc.jpg"
  },
  {
    id: 3,
    name: "무선 핸드블렌더 5단 스틱형",
    category: "핸드블렌더",
    brand: "상호블렌드",
    price: 78000,
    discount: 35,
    rating: 4.7,
    reviews: 1876,
    flag: "",
    emoji: "🧃",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDg1Mi13aGlwcGluZy1kb3VnaC5qcGc.jpg"
  },
  {
    id: 4,
    name: "스탠드 믹서 5.5L 반죽 전용",
    category: "스탠드믹서",
    brand: "베이크홈",
    price: 398000,
    discount: 30,
    rating: 4.9,
    reviews: 864,
    flag: "BEST",
    emoji: "🎂",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvaXM5NTE3LWltYWdlLWt3dnlmaGQ2LmpwZw.jpg"
  },
  {
    id: 5,
    name: "핸드 믹서 7단 300W 거품기",
    category: "핸드믹서",
    brand: "베이크홈",
    price: 46000,
    discount: 33,
    rating: 4.6,
    reviews: 1544,
    flag: "",
    emoji: "🥚",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg5NDY2MjYtaW1hZ2Uta3d5bzB2aDAuanBn.jpg"
  },
  {
    id: 6,
    name: "휴대용 텀블러 믹서 400ml USB충전",
    category: "휴대용믹서",
    brand: "상호블렌드",
    price: 52000,
    discount: 40,
    rating: 4.5,
    reviews: 2765,
    flag: "NEW",
    emoji: "🧋",
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=900&q=80"
  },
  {
    id: 7,
    name: "다용도 믹서 세트 4종 컵",
    category: "복합믹서",
    brand: "상호블렌드",
    price: 142000,
    discount: 36,
    rating: 4.7,
    reviews: 932,
    flag: "",
    emoji: "🍹",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDE4OC1tYWtpbmctaGVhbHRoeS1zbW9vdGhpZS5qcGc.jpg"
  },
  {
    id: 8,
    name: "미니 초퍼 분쇄기 600ml",
    category: "초퍼·분쇄기",
    brand: "상호블렌드",
    price: 39800,
    discount: 28,
    rating: 4.5,
    reviews: 1203,
    flag: "",
    emoji: "🔪",
    image: "https://cdn.stocksnap.io/img-thumbs/960w/B7CBYNNKVF.jpg"
  },
  {
    id: 9,
    name: "원두 그라인더 수동 세라믹날",
    category: "그라인더",
    brand: "차하루",
    price: 34000,
    discount: 25,
    rating: 4.6,
    reviews: 678,
    flag: "",
    emoji: "☕",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyY29mZmVlX2NvZmZlZV9ncmluZGVyX21pbGwtaW1hZ2Uta3liYnNyOTUuanBn.jpg"
  },
  {
    id: 10,
    name: "원두 그라인더 & 드립 세트",
    category: "그라인더",
    brand: "차하루",
    price: 89000,
    discount: 31,
    rating: 4.7,
    reviews: 445,
    flag: "NEW",
    emoji: "☕",
    image: "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJjb2ZmZWVfZ3JpbmRlcl9jb2ZmZWVfcGFkcy1pbWFnZS1reWJkeHZncy5qcGc.jpg"
  },
  {
    id: 11,
    name: "전동 커피 그라인더 무단조절",
    category: "그라인더",
    brand: "차하루",
    price: 124000,
    discount: 27,
    rating: 4.8,
    reviews: 1067,
    flag: "",
    emoji: "⚙️",
    image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=900&q=80"
  },
  {
    id: 12,
    name: "유리 수동 착즙기 레몬 스퀴저",
    category: "착즙기",
    brand: "상호블렌드",
    price: 18900,
    discount: 22,
    rating: 4.4,
    reviews: 834,
    flag: "",
    emoji: "🍋",
    image: "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3N2MTk3MzE5LWltYWdlLWt3dnVoMGFkLmpwZw.jpg"
  },
  {
    id: 13,
    name: "핸드 착즙기 시트러스 프레스",
    category: "착즙기",
    brand: "상호블렌드",
    price: 26500,
    discount: 29,
    rating: 4.5,
    reviews: 1392,
    flag: "",
    emoji: "🍊",
    image: "https://cdn.stocksnap.io/img-thumbs/960w/BZCDFHLKZR.jpg"
  }
];
