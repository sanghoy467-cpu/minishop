-- =========================================================
-- 삼환 물류(주) (minishop) — Supabase 스키마
--
-- 실행 방법
--   Supabase 대시보드 → SQL Editor → 아래 전체를 붙여넣고 Run
--   (여러 번 실행해도 안전하도록 작성했습니다)
--
-- 보안 요약
--   products : 누구나 읽기만 가능 (쓰기 불가)
--   orders   : 누구나 생성 가능(비회원 주문 허용), 조회는 본인 주문만
-- =========================================================


-- ---------------------------------------------------------
-- 1. 상품
-- ---------------------------------------------------------
create table if not exists public.products (
  id         bigint primary key,
  name       text    not null,
  category   text    not null,
  brand      text    not null,
  price      integer not null check (price >= 0),
  discount   integer not null default 0 check (discount between 0 and 100),
  rating     numeric(2,1) not null default 0,
  reviews    integer not null default 0,
  flag       text    not null default '',
  emoji      text    not null default '🍳',
  image      text    not null,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "상품은 누구나 조회할 수 있다" on public.products;
create policy "상품은 누구나 조회할 수 있다"
  on public.products for select
  using (true);


-- ---------------------------------------------------------
-- 2. 주문
--    items 는 주문 시점의 상품 정보를 그대로 담습니다.
--    (나중에 상품 가격이 바뀌어도 주문 내역은 보존됩니다)
-- ---------------------------------------------------------
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  order_no    text not null unique,
  user_id     uuid references auth.users(id) on delete set null,
  buyer_type  text not null check (buyer_type in ('member', 'guest')),
  buyer_name  text not null,
  buyer_phone text,
  items       jsonb   not null,
  total       integer not null check (total >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);

alter table public.orders enable row level security;

-- 주문 생성 : 비회원도 가능. 단, 회원 주문이면 본인 계정이어야 함.
drop policy if exists "주문은 누구나 생성할 수 있다" on public.orders;
create policy "주문은 누구나 생성할 수 있다"
  on public.orders for insert
  with check (
       (buyer_type = 'guest'  and user_id is null)
    or (buyer_type = 'member' and user_id = auth.uid())
  );

-- 주문 조회 : 로그인한 본인의 주문만.
-- (비회원 주문은 조회 정책이 없으므로 누구도 읽을 수 없습니다 —
--  주문번호는 주문 완료 화면에서만 확인합니다)
drop policy if exists "회원은 자기 주문만 조회할 수 있다" on public.orders;
create policy "회원은 자기 주문만 조회할 수 있다"
  on public.orders for select
  using (user_id = auth.uid());


-- ---------------------------------------------------------
-- ---------------------------------------------------------
-- 3. 상품 데이터 (주방용품 믹서기 13종)
--    이미 있으면 최신 값으로 갱신합니다.
-- ---------------------------------------------------------
insert into public.products
  (id, name, category, brand, price, discount, rating, reviews, flag, emoji, image)
values
  (1, '프로 고속 블렌더 1.5L 2200W', '고속블렌더', '상호블렌드', 189000, 38, 4.9, 2341, 'BEST', '🥤', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDQyOS1oZWFsdGh5LXNtb290aGllLWluZ3JlZGllbnRzLmpwZw.jpg'),
  (2, '진공 고속 블렌더 1.2L 산화방지', '고속블렌더', '상호블렌드', 234000, 42, 4.8, 1128, 'BEST', '🥤', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDM1OC1oZWFsdGh5LXNtb290aGllLWluZ3JlZGllbnRzMS5qcGc.jpg'),
  (3, '무선 핸드블렌더 5단 스틱형', '핸드블렌더', '상호블렌드', 78000, 35, 4.7, 1876, '', '🧃', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDg1Mi13aGlwcGluZy1kb3VnaC5qcGc.jpg'),
  (4, '스탠드 믹서 5.5L 반죽 전용', '스탠드믹서', '베이크홈', 398000, 30, 4.9, 864, 'BEST', '🎂', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvaXM5NTE3LWltYWdlLWt3dnlmaGQ2LmpwZw.jpg'),
  (5, '핸드 믹서 7단 300W 거품기', '핸드믹서', '베이크홈', 46000, 33, 4.6, 1544, '', '🥚', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg5NDY2MjYtaW1hZ2Uta3d5bzB2aDAuanBn.jpg'),
  (6, '휴대용 텀블러 믹서 400ml USB충전', '휴대용믹서', '상호블렌드', 52000, 40, 4.5, 2765, 'NEW', '🧋', 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=900&q=80'),
  (7, '다용도 믹서 세트 4종 컵', '복합믹서', '상호블렌드', 142000, 36, 4.7, 932, '', '🍹', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDE4OC1tYWtpbmctaGVhbHRoeS1zbW9vdGhpZS5qcGc.jpg'),
  (8, '미니 초퍼 분쇄기 600ml', '초퍼·분쇄기', '상호블렌드', 39800, 28, 4.5, 1203, '', '🔪', 'https://cdn.stocksnap.io/img-thumbs/960w/B7CBYNNKVF.jpg'),
  (9, '원두 그라인더 수동 세라믹날', '그라인더', '차하루', 34000, 25, 4.6, 678, '', '☕', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyY29mZmVlX2NvZmZlZV9ncmluZGVyX21pbGwtaW1hZ2Uta3liYnNyOTUuanBn.jpg'),
  (10, '원두 그라인더 & 드립 세트', '그라인더', '차하루', 89000, 31, 4.7, 445, 'NEW', '☕', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJjb2ZmZWVfZ3JpbmRlcl9jb2ZmZWVfcGFkcy1pbWFnZS1reWJkeHZncy5qcGc.jpg'),
  (11, '전동 커피 그라인더 무단조절', '그라인더', '차하루', 124000, 27, 4.8, 1067, '', '⚙️', 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=900&q=80'),
  (12, '유리 수동 착즙기 레몬 스퀴저', '착즙기', '상호블렌드', 18900, 22, 4.4, 834, '', '🍋', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3N2MTk3MzE5LWltYWdlLWt3dnVoMGFkLmpwZw.jpg'),
  (13, '핸드 착즙기 시트러스 프레스', '착즙기', '상호블렌드', 26500, 29, 4.5, 1392, '', '🍊', 'https://cdn.stocksnap.io/img-thumbs/960w/BZCDFHLKZR.jpg')
on conflict (id) do update set
  name     = excluded.name,
  category = excluded.category,
  brand    = excluded.brand,
  price    = excluded.price,
  discount = excluded.discount,
  rating   = excluded.rating,
  reviews  = excluded.reviews,
  flag     = excluded.flag,
  emoji    = excluded.emoji,
  image    = excluded.image;
