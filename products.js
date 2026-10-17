/* =========================================================
   삼환 물류(주) — 상품 데이터 (국내 화폐 19종)

   한국은행권 구권 · 신권, 환(圜) 지폐, 주화를 다룹니다.
   이 파일은 Supabase 연결이 안 될 때만 쓰이는 예비 데이터이고,
   평소에는 products 테이블에서 받아온 값으로 덮어씁니다.

   image : Wikimedia Commons 의 한국 화폐 도안 이미지 링크.
           한국은행 "화폐도안 이용기준"에 따라 이용하며,
           도안에서 인물만 분리하거나 변형하지 않고 원형 그대로 씁니다.
   price : 정가(원) / discount : 할인율(%) / 판매가는 app.js 에서 계산
   emoji : 이미지 로딩 실패 시 보여줄 대체 썸네일용 이모지
   ========================================================= */

var PRODUCTS = [
  {
    id: 1,
    name: "10000원 1차 발행권 가군 미사용",
    category: "지폐·구권",
    brand: "한국화폐",
    price: 180000,
    discount: 15,
    rating: 4.9,
    reviews: 87,
    flag: "BEST",
    emoji: "💴",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/13/10000_won_serieI_obverse.jpeg"
  },
  {
    id: 2,
    name: "10000원 3차 발행권 미사용",
    category: "지폐·구권",
    brand: "한국화폐",
    price: 95000,
    discount: 20,
    rating: 4.7,
    reviews: 134,
    flag: "",
    emoji: "💴",
    image: "https://upload.wikimedia.org/wikipedia/commons/4/44/10000_won_serieIII_obverse.jpeg"
  },
  {
    id: 3,
    name: "5000원 1차 발행권 율곡 미사용",
    category: "지폐·구권",
    brand: "한국화폐",
    price: 240000,
    discount: 12,
    rating: 4.9,
    reviews: 62,
    flag: "BEST",
    emoji: "💴",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b4/5000_won_serieI_obverse.jpeg"
  },
  {
    id: 4,
    name: "1000원 1차 발행권 퇴계 미사용",
    category: "지폐·구권",
    brand: "한국화폐",
    price: 165000,
    discount: 18,
    rating: 4.8,
    reviews: 103,
    flag: "",
    emoji: "💴",
    image: "https://upload.wikimedia.org/wikipedia/commons/5/58/1000_won_serieI_obverse.jpeg"
  },
  {
    id: 5,
    name: "100원 2차 발행권 독립문",
    category: "지폐·구권",
    brand: "고전지폐",
    price: 78000,
    discount: 22,
    rating: 4.6,
    reviews: 215,
    flag: "",
    emoji: "💴",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/df/100_won_serieII_obverse.jpeg"
  },
  {
    id: 6,
    name: "50원 1차 발행권",
    category: "지폐·구권",
    brand: "고전지폐",
    price: 52000,
    discount: 25,
    rating: 4.5,
    reviews: 178,
    flag: "",
    emoji: "💴",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/23/50_won_serieI_obverse.jpeg"
  },
  {
    id: 7,
    name: "10000원 신권 미사용 연번호",
    category: "지폐·신권",
    brand: "한국화폐",
    price: 24000,
    discount: 10,
    rating: 4.8,
    reviews: 642,
    flag: "NEW",
    emoji: "💵",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1c/10000_won_serieVI_obverse.jpeg"
  },
  {
    id: 8,
    name: "5000원 신권 미사용 연번호",
    category: "지폐·신권",
    brand: "한국화폐",
    price: 13500,
    discount: 12,
    rating: 4.7,
    reviews: 588,
    flag: "NEW",
    emoji: "💵",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/bb/5000_won_serieV_obverse.jpeg"
  },
  {
    id: 9,
    name: "1000원 신권 미사용 연번호",
    category: "지폐·신권",
    brand: "한국화폐",
    price: 4500,
    discount: 8,
    rating: 4.6,
    reviews: 921,
    flag: "",
    emoji: "💵",
    image: "https://upload.wikimedia.org/wikipedia/commons/8/8c/1000_won_serieIII_obverse.jpeg"
  },
  {
    id: 10,
    name: "1000환 1960년 세종대왕 견양",
    category: "지폐·환",
    brand: "고전지폐",
    price: 420000,
    discount: 14,
    rating: 4.9,
    reviews: 48,
    flag: "BEST",
    emoji: "📜",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/19/1000_hwan_600815_obverse.jpg"
  },
  {
    id: 11,
    name: "500환 1961년 세종대왕 견양",
    category: "지폐·환",
    brand: "고전지폐",
    price: 310000,
    discount: 16,
    rating: 4.8,
    reviews: 57,
    flag: "",
    emoji: "📜",
    image: "https://upload.wikimedia.org/wikipedia/commons/7/75/500_hwan_610419_obverse.jpg"
  },
  {
    id: 12,
    name: "100환 1962년 모자상",
    category: "지폐·환",
    brand: "고전지폐",
    price: 135000,
    discount: 20,
    rating: 4.7,
    reviews: 112,
    flag: "",
    emoji: "📜",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/bf/100_hwan_620516_obverse.jpg"
  },
  {
    id: 13,
    name: "10환 1953년 남대문",
    category: "지폐·환",
    brand: "고전지폐",
    price: 88000,
    discount: 24,
    rating: 4.6,
    reviews: 96,
    flag: "",
    emoji: "📜",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f6/10_hwan_531215_obverse.jpg"
  },
  {
    id: 14,
    name: "100원 주화 1970년 초년도",
    category: "주화·원",
    brand: "삼환화폐",
    price: 65000,
    discount: 18,
    rating: 4.8,
    reviews: 143,
    flag: "",
    emoji: "🪙",
    image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/100_won_1970_obverse.jpeg"
  },
  {
    id: 15,
    name: "100원 주화 1983년",
    category: "주화·원",
    brand: "삼환화폐",
    price: 12000,
    discount: 28,
    rating: 4.5,
    reviews: 327,
    flag: "",
    emoji: "🪙",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/91/100_won_1983_obverse.jpeg"
  },
  {
    id: 16,
    name: "500원 주화 1982년 초년도",
    category: "주화·원",
    brand: "삼환화폐",
    price: 45000,
    discount: 22,
    rating: 4.7,
    reviews: 189,
    flag: "",
    emoji: "🪙",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/01/500_won_1982_obverse.jpeg"
  },
  {
    id: 17,
    name: "100환 주화 1959년",
    category: "주화·환",
    brand: "삼환화폐",
    price: 72000,
    discount: 19,
    rating: 4.7,
    reviews: 74,
    flag: "",
    emoji: "🪙",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/100_hwan_coin_obverse.jpeg"
  },
  {
    id: 18,
    name: "50환 주화 1959년",
    category: "주화·환",
    brand: "삼환화폐",
    price: 38000,
    discount: 26,
    rating: 4.6,
    reviews: 118,
    flag: "",
    emoji: "🪙",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e9/50_hwan_coin_obverse.jpeg"
  },
  {
    id: 19,
    name: "한국 주화 모음 6종 세트",
    category: "세트",
    brand: "삼환화폐",
    price: 58000,
    discount: 30,
    rating: 4.6,
    reviews: 402,
    flag: "NEW",
    emoji: "🧧",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Southkoreancoins.jpg"
  }
];
