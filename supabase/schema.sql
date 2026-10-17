-- =========================================================
-- 삼환 물류(주) — 화폐수집 동전과 지폐 Supabase 스키마
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
  id            uuid primary key default gen_random_uuid(),
  order_no      text not null unique,
  user_id       uuid references auth.users(id) on delete set null,
  buyer_type    text not null check (buyer_type in ('member', 'guest')),
  buyer_name    text not null,
  buyer_phone   text,
  buyer_address text,          -- 주문서의 배송 주소
  buyer_detail  text,          -- 상세 주소 (동 · 호수)
  buyer_memo    text,          -- 배송 요청사항
  items         jsonb   not null,
  total         integer not null check (total >= 0),
  created_at    timestamptz not null default now()
);

-- 배송 정보 컬럼이 없던 시점에 만든 테이블에도 채워 넣습니다.
alter table public.orders add column if not exists buyer_address text;
alter table public.orders add column if not exists buyer_detail  text;
alter table public.orders add column if not exists buyer_memo    text;

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
-- ---------------------------------------------------------
-- ---------------------------------------------------------
-- 3. 상품 데이터 (국내 화폐 19종 — 지폐 구권·신권·환, 주화)
--    이미 있으면 최신 값으로 갱신합니다.
-- ---------------------------------------------------------
insert into public.products
  (id, name, category, brand, price, discount, rating, reviews, flag, emoji, image)
values
  (1, '10000원 1차 발행권 가군 미사용', '지폐·구권', '한국화폐', 180000, 15, 4.9, 87, 'BEST', '💴', 'https://upload.wikimedia.org/wikipedia/commons/1/13/10000_won_serieI_obverse.jpeg'),
  (2, '10000원 3차 발행권 미사용', '지폐·구권', '한국화폐', 95000, 20, 4.7, 134, '', '💴', 'https://upload.wikimedia.org/wikipedia/commons/4/44/10000_won_serieIII_obverse.jpeg'),
  (3, '5000원 1차 발행권 율곡 미사용', '지폐·구권', '한국화폐', 240000, 12, 4.9, 62, 'BEST', '💴', 'https://upload.wikimedia.org/wikipedia/commons/b/b4/5000_won_serieI_obverse.jpeg'),
  (4, '1000원 1차 발행권 퇴계 미사용', '지폐·구권', '한국화폐', 165000, 18, 4.8, 103, '', '💴', 'https://upload.wikimedia.org/wikipedia/commons/5/58/1000_won_serieI_obverse.jpeg'),
  (5, '100원 2차 발행권 독립문', '지폐·구권', '고전지폐', 78000, 22, 4.6, 215, '', '💴', 'https://upload.wikimedia.org/wikipedia/commons/d/df/100_won_serieII_obverse.jpeg'),
  (6, '50원 1차 발행권', '지폐·구권', '고전지폐', 52000, 25, 4.5, 178, '', '💴', 'https://upload.wikimedia.org/wikipedia/commons/2/23/50_won_serieI_obverse.jpeg'),
  (7, '10000원 신권 미사용 연번호', '지폐·신권', '한국화폐', 24000, 10, 4.8, 642, 'NEW', '💵', 'https://upload.wikimedia.org/wikipedia/commons/1/1c/10000_won_serieVI_obverse.jpeg'),
  (8, '5000원 신권 미사용 연번호', '지폐·신권', '한국화폐', 13500, 12, 4.7, 588, 'NEW', '💵', 'https://upload.wikimedia.org/wikipedia/commons/b/bb/5000_won_serieV_obverse.jpeg'),
  (9, '1000원 신권 미사용 연번호', '지폐·신권', '한국화폐', 4500, 8, 4.6, 921, '', '💵', 'https://upload.wikimedia.org/wikipedia/commons/8/8c/1000_won_serieIII_obverse.jpeg'),
  (10, '1000환 1960년 세종대왕 견양', '지폐·환', '고전지폐', 420000, 14, 4.9, 48, 'BEST', '📜', 'https://upload.wikimedia.org/wikipedia/commons/1/19/1000_hwan_600815_obverse.jpg'),
  (11, '500환 1961년 세종대왕 견양', '지폐·환', '고전지폐', 310000, 16, 4.8, 57, '', '📜', 'https://upload.wikimedia.org/wikipedia/commons/7/75/500_hwan_610419_obverse.jpg'),
  (12, '100환 1962년 모자상', '지폐·환', '고전지폐', 135000, 20, 4.7, 112, '', '📜', 'https://upload.wikimedia.org/wikipedia/commons/b/bf/100_hwan_620516_obverse.jpg'),
  (13, '10환 1953년 남대문', '지폐·환', '고전지폐', 88000, 24, 4.6, 96, '', '📜', 'https://upload.wikimedia.org/wikipedia/commons/f/f6/10_hwan_531215_obverse.jpg'),
  (14, '100원 주화 1970년 초년도', '주화·원', '삼환화폐', 65000, 18, 4.8, 143, '', '🪙', 'https://upload.wikimedia.org/wikipedia/commons/4/4e/100_won_1970_obverse.jpeg'),
  (15, '100원 주화 1983년', '주화·원', '삼환화폐', 12000, 28, 4.5, 327, '', '🪙', 'https://upload.wikimedia.org/wikipedia/commons/9/91/100_won_1983_obverse.jpeg'),
  (16, '500원 주화 1982년 초년도', '주화·원', '삼환화폐', 45000, 22, 4.7, 189, '', '🪙', 'https://upload.wikimedia.org/wikipedia/commons/0/01/500_won_1982_obverse.jpeg'),
  (17, '100환 주화 1959년', '주화·환', '삼환화폐', 72000, 19, 4.7, 74, '', '🪙', 'https://upload.wikimedia.org/wikipedia/commons/2/2a/100_hwan_coin_obverse.jpeg'),
  (18, '50환 주화 1959년', '주화·환', '삼환화폐', 38000, 26, 4.6, 118, '', '🪙', 'https://upload.wikimedia.org/wikipedia/commons/e/e9/50_hwan_coin_obverse.jpeg'),
  (19, '한국 주화 모음 6종 세트', '세트', '삼환화폐', 58000, 30, 4.6, 402, 'NEW', '🧧', 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Southkoreancoins.jpg')
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
