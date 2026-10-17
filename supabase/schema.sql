-- =========================================================
-- 삼환 물류(주) — 화폐판매 Supabase 스키마
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
-- 3. 상품 데이터 (화폐 18종 — 동전과 지폐 구권 · 신권)
--    이미 있으면 최신 값으로 갱신합니다.
-- ---------------------------------------------------------
insert into public.products
  (id, name, category, brand, price, discount, rating, reviews, flag, emoji, image)
values
  (1, '1861년 미국 5달러 대형 구권', '지폐·구권', '고전화폐사', 1850000, 18, 4.9, 142, 'BEST', '💵', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drMjUxODMwMzMtaW1hZ2UuanBn.jpg'),
  (2, '1862년 미국 50달러 대형 구권', '지폐·구권', '고전화폐사', 3200000, 15, 4.8, 87, 'BEST', '💵', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drMzM0MjIxMjgtaW1hZ2UuanBn.jpg'),
  (3, '1926년 프랑스 1000프랑 구권', '지폐·구권', '고전화폐사', 680000, 25, 4.7, 213, '', '💶', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTEwL3BkbWlzYzYtd2szMDU5OTkzNS0wMS1pbWFnZV8xLmpwZw.jpg'),
  (4, '남부연합 5·100달러 구권 2매 세트', '지폐·구권', '고전화폐사', 1240000, 22, 4.6, 96, '', '📜', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJiaWxsc19jb25mZWRlcmF0ZV9zdGF0ZXNfYW1lcmljYS1pbWFnZS1reWJlOHpvZC5qcGc.jpg'),
  (5, '1909년 독일 제국은행권 100마르크', '지폐·구권', '고전화폐사', 145000, 30, 4.7, 458, '', '📜', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyYmFua19ub3RlX2ltcGVyaWFsX2Jhbmtub3RlXzItaW1hZ2Uta3liYzdkOGEuanBn.jpg'),
  (6, '독일 제국은행권 구권 모음 5매', '지폐·구권', '고전화폐사', 390000, 28, 4.8, 301, 'BEST', '📜', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJtb25leV9kb2xsYXJfYmlsbF9iaWxscy1pbWFnZS1reWJkN25uaS5qcGc.jpg'),
  (7, '1928년 미국 5달러 소형 신권', '지폐·신권', '프리미엄노트', 920000, 20, 4.8, 176, '', '💵', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drMjQ4ODcyMzctaW1hZ2UuanBn.jpg'),
  (8, '미국 1달러 신권 미사용 연번호', '지폐·신권', '프리미엄노트', 38000, 26, 4.5, 1204, 'NEW', '💵', 'https://cdn.stocksnap.io/img-thumbs/960w/HHH84SKFXQ.jpg'),
  (9, '미국 달러 신권 묶음 20매', '지폐·신권', '프리미엄노트', 185000, 24, 4.6, 642, '', '💵', 'https://cdn.stocksnap.io/img-thumbs/960w/RG4XMMLSNU.jpg'),
  (10, '유로 10유로 신권 10매 연번호', '지폐·신권', '프리미엄노트', 235000, 21, 4.7, 388, 'NEW', '💶', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZybW9uZXlfZXVyb3NfYmFua25vdGVzX2JpbGxzXzAtaW1hZ2Uta3liZDcwZGQuanBn.jpg'),
  (11, '유로 고액권 200·500 세트', '지폐·신권', '프리미엄노트', 1480000, 12, 4.9, 154, '', '💶', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZybW9uZXlfc2VlbV9ldXJvX2JpbGxzXzQtaW1hZ2Uta3liYjJwZ3UuanBn.jpg'),
  (12, '1807년 미국 5달러 금화', '금화', '삼환화폐', 4800000, 10, 5.0, 63, 'BEST', '🪙', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drNDI4MTYxMDMtaW1hZ2UuanBn.jpg'),
  (13, '프랑스 20프랑 세레스 금화', '금화', '삼환화폐', 1120000, 16, 4.8, 227, '', '🪙', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvZmlsZXMvd2Vic2l0ZS8yMDIyLTExL3drNzk2ODk0OTYtaW1hZ2UuanBn.jpg'),
  (14, '로마 트라야누스 금화 아우레우스', '고대주화', '삼환화폐', 6500000, 8, 5.0, 41, 'BEST', '🏛️', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drODAzOTgwMTYtaW1hZ2UuanBn.jpg'),
  (15, '로마 하드리아누스 청동화', '고대주화', '삼환화폐', 740000, 19, 4.7, 118, '', '🏛️', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3drODAxNDQ3NDMtaW1hZ2UuanBn.jpg'),
  (16, '빅토리아 여왕 즉위 60주년 기념 금메달', '기념주화', '월드코인', 2850000, 14, 4.9, 72, '', '🏅', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA5L21ldDE5MDU0OC1pbWFnZS5qcGc.jpg'),
  (17, '나폴레옹 3세 만국박람회 기념 은메달', '기념주화', '월드코인', 560000, 23, 4.6, 165, '', '🏅', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZmwzOTQ3NzMxNjU1MS1pbWFnZS1reWNqNHpweS5qcGc.jpg'),
  (18, '세계 각국 주화 30종 컬렉션', '세계주화', '월드코인', 128000, 35, 4.5, 892, 'NEW', '🌏', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTI0NzI3OS1pbWFnZS1rd3lxdHkzZy5qcGc.jpg')
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
