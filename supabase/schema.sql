-- =========================================================
-- 상호상회 (minishop) — Supabase 스키마
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
-- 3. 상품 데이터 (29종)
--    이미 있으면 최신 값으로 갱신합니다.
-- ---------------------------------------------------------
insert into public.products
  (id, name, category, brand, price, discount, rating, reviews, flag, emoji, image)
values
  (1, '레드 에나멜 주물 프라이팬 26cm', '냄비·팬', '상호키친', 89000, 35, 4.8, 1342, 'BEST', '🍳', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJwYW5fZnJ5aW5nX2Nvb2tpbmdfa2l0Y2hlbi1pbWFnZS1reWJkMXM0Ny5qcGc.jpg'),
  (2, '세라믹 절구 & 원목 도마 3종 세트', '조리도구', '상호우드', 46000, 28, 4.6, 512, '', '🥣', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg2OTkwNDQtaW1hZ2Uta3d2eGgyMGguanBn.jpg'),
  (3, '스테인리스 3중바닥 양수냄비 24cm', '냄비·팬', '상호키친', 74000, 32, 4.7, 876, 'BEST', '🍲', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvYTAxOS1qYWt1YmstMDg1Ny1jb29raW5nLWhvbWVtYWRlLWNoaWNrZW4tYnJvdGguanBn.jpg'),
  (4, '캠핑 세라믹 머그 350ml', '컵·잔', '데일리컵', 16800, 22, 4.5, 2104, '', '☕', 'https://cdn.stocksnap.io/img-thumbs/960w/M4PI6CXDDP.jpg'),
  (5, '무선 전기포트 1.7L 자동전원차단', '주방가전', '상호일렉', 39900, 30, 4.4, 1588, 'NEW', '🫖', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJlbGVjdHJpY19rZXR0bGVfcGxhc3RpY193aGl0ZS1pbWFnZS1reWNoOGlieC5qcGc.jpg'),
  (6, '수제 원목 스프 국자', '조리도구', '상호우드', 18500, 18, 4.6, 341, '', '🥄', 'https://cdn.stocksnap.io/img-thumbs/960w/D3C224D972.jpg'),
  (7, '스테인리스 풍선형 거품기 28cm', '조리도구', '베이크홈', 12900, 25, 4.7, 967, '', '🥚', 'https://cdn.stocksnap.io/img-thumbs/960w/HBF5CWQP3S.jpg'),
  (9, '프리시즌 무쇠 스킬렛 25cm', '냄비·팬', '아이언마스터', 62000, 40, 4.9, 1735, 'BEST', '🍳', 'https://cdn.stocksnap.io/img-thumbs/960w/AWIJ3PXKJE.jpg'),
  (10, '헤비 글라스 텀블러 420ml 2P', '컵·잔', '데일리컵', 19800, 20, 4.3, 654, '', '🥃', 'https://cdn.stocksnap.io/img-thumbs/960w/BM56P5JIA9.jpg'),
  (11, '블랙 도자기 티포트 700ml', '컵·잔', '차하루', 38000, 26, 4.6, 389, '', '🫖', 'https://cdn.stocksnap.io/img-thumbs/960w/5811FEC469.jpg'),
  (12, '스테인리스 양날 감자칼', '조리도구', '상호키친', 7900, 30, 4.7, 3210, 'BEST', '🥔', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTA4Mzg0Ni1pbWFnZS1rd3Z3YzBxZS5qcGc.jpg'),
  (13, '우드 논스틱 뒤집개 2P 세트', '조리도구', '상호우드', 15600, 24, 4.5, 782, '', '🥄', 'https://cdn.stocksnap.io/img-thumbs/960w/QSUFZLT8SV.jpg'),
  (14, '원목 계량스푼 5종 세트', '조리도구', '베이크홈', 13400, 35, 4.4, 521, '', '🧂', 'https://cdn.stocksnap.io/img-thumbs/960w/URN8E7KDE7.jpg'),
  (15, '비치우드 반죽 밀대 45cm', '조리도구', '베이크홈', 22000, 27, 4.6, 298, '', '🥐', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyYmFrZV9kb3VnaF9wcmVwYXJhdGlvbl9mbG91ci1pbWFnZS1reWJjNmQ4di5qcGc.jpg'),
  (16, '레드 커피잔 & 소서 2인조', '컵·잔', '차하루', 32000, 38, 4.7, 1043, '', '☕', 'https://cdn.stocksnap.io/img-thumbs/960w/NVKXLIKJ25.jpg'),
  (17, '대나무 젓가락 10P & 수저통 세트', '식기', '상호우드', 21500, 29, 4.5, 612, '', '🥢', 'https://cdn.stocksnap.io/img-thumbs/960w/3957479LEK.jpg'),
  (18, '디너 테이블웨어 풀세트 16P', '식기', '상호키친', 128000, 45, 4.8, 476, 'BEST', '🍽️', 'https://cdn.stocksnap.io/img-thumbs/960w/IWUAHEIBSE.jpg'),
  (19, '무쇠 전골 불판 28cm', '냄비·팬', '아이언마스터', 58000, 34, 4.6, 389, '', '🔥', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA2L3drNjEyODg4MDEtaW1hZ2Uta3A2Y25zNm8uanBn.jpg'),
  (20, '논스틱 머핀 베이킹 트레이 6구', '베이킹', '베이크홈', 24900, 31, 4.5, 1124, 'NEW', '🧁', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTEwOTI3Ni1pbWFnZS1rd3Z3YThzcy5qcGc.jpg'),
  (21, '코튼 캔버스 주방 앞치마', '주방잡화', '상호리빙', 26800, 40, 4.6, 854, '', '🦺', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHUyMzMyODk2LWltYWdlLWt3dndtMzZzLmpwZw.jpg'),
  (22, '유리 소금·후추 디스펜서 2P', '주방잡화', '상호리빙', 11900, 23, 4.4, 467, '', '🧂', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZsMzYxNjA0NDg4Mi1pbWFnZS1reWJlaHJybi5qcGc.jpg'),
  (23, '스테인리스 진공 보온병 500ml', '주방잡화', '상호일렉', 34000, 36, 4.7, 1902, 'BEST', '🧴', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvdXB3azYyMjkwNDQxLXdpa2ltZWRpYS1pbWFnZS1rb3dzMWFydS5qcGc.jpg'),
  (24, '화이트 도자기 티포트 세트 4P', '컵·잔', '차하루', 54000, 42, 4.8, 337, '', '🫖', 'https://cdn.stocksnap.io/img-thumbs/960w/VSLCRUIGUD.jpg'),
  (25, '원목 조리스푼 6P 풀세트', '조리도구', '상호우드', 29800, 37, 4.7, 1266, 'BEST', '🥄', 'https://cdn.stocksnap.io/img-thumbs/960w/NW1WJ88VGJ.jpg'),
  (26, '원목 서빙 트레이 라지', '식기', '상호우드', 31000, 25, 4.5, 403, '', '🪵', 'https://cdn.stocksnap.io/img-thumbs/960w/W8LJ1IW97U.jpg'),
  (27, '스테인리스 커트러리 12P 세트', '식기', '상호키친', 42000, 33, 4.6, 729, '', '🍴', 'https://cdn.stocksnap.io/img-thumbs/960w/W7U3CO2QM3.jpg'),
  (28, '스테인리스 국자 32cm', '조리도구', '상호키친', 9800, 21, 4.4, 1087, '', '🥣', 'https://cdn.stocksnap.io/img-thumbs/960w/NEJP8ZW18V.jpg'),
  (29, '법랑 캠핑 머그 300ml', '컵·잔', '데일리컵', 14500, 19, 4.6, 1455, 'NEW', '☕', 'https://cdn.stocksnap.io/img-thumbs/960w/6D1M1USFFO.jpg'),
  (30, '스테인리스 휘슬 주전자 2.5L', '냄비·팬', '상호키친', 45000, 29, 4.7, 698, '', '🫖', 'https://cdn.stocksnap.io/img-thumbs/960w/ND9JSEK2QN.jpg')
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
