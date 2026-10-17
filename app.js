/* =========================================================
   상호상회 — 애플리케이션 로직
   로그인 / 상품 목록 / 찜하기 / 장바구니
   모든 상태는 브라우저 localStorage 에 저장됩니다.
   ========================================================= */

(function () {
  'use strict';

  // ------------------------------------------------------- 저장소 키
  var KEY_USER = 'sangho.user';
  var KEY_WISH = 'sangho.wish';
  var KEY_CART = 'sangho.cart';

  // ------------------------------------------------------- 상태
  var state = {
    user: null,
    wish: [],          // [productId, ...]
    cart: [],          // [{ id, qty }, ...]
    category: '전체',
    keyword: '',
    sort: 'recommend',
    onlyWish: false
  };

  // ------------------------------------------------------- 유틸
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 무시 */ }
  }

  function won(n) {
    return Math.round(n).toLocaleString('ko-KR');
  }

  /** 할인율을 적용한 판매가 (10원 단위 절삭) */
  function salePrice(p) {
    return Math.floor(p.price * (100 - p.discount) / 100 / 10) * 10;
  }

  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function stars(rating) {
    var full = Math.round(rating);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 이미지 로딩 실패 시 보여줄 대체 썸네일 (인라인 SVG) */
  function fallbackImage(label) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#ece3d6"/>' +
      '<text x="200" y="186" font-size="72" text-anchor="middle">' + label + '</text>' +
      '<text x="200" y="244" font-size="20" fill="#9c8e83" text-anchor="middle" ' +
      'font-family="sans-serif">상호상회</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ------------------------------------------------------- 토스트
  var toastBox;

  function toast(message, icon) {
    if (!toastBox) toastBox = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + (icon || '✓') + '</span><span>' + escapeHtml(message) + '</span>';
    toastBox.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 260);
    }, 1900);
  }

  /* =======================================================
     로그인
     아이디와 비밀번호를 입력하기만 하면 통과합니다.
     (데모용 — 실제 인증 서버 없이 브라우저에만 기록)
     ======================================================= */

  function initAuth() {
    var gate = $('#gate');
    var form = $('#loginForm');
    var idInput = $('#loginId');
    var pwInput = $('#loginPw');
    var errorBox = $('#loginError');

    state.user = load(KEY_USER, null);

    if (state.user) {
      openShop();
    } else {
      gate.hidden = false;
      document.body.classList.add('is-locked');
      setTimeout(function () { idInput.focus(); }, 120);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = idInput.value.trim();
      var pw = pwInput.value;

      if (!id) {
        errorBox.textContent = '아이디를 입력해 주세요.';
        idInput.focus();
        return;
      }
      if (!pw) {
        errorBox.textContent = '비밀번호를 입력해 주세요.';
        pwInput.focus();
        return;
      }
      if (pw.length < 2) {
        errorBox.textContent = '비밀번호는 2자 이상 입력해 주세요.';
        pwInput.focus();
        return;
      }

      errorBox.textContent = '';
      state.user = { id: id, since: new Date().toISOString() };
      save(KEY_USER, state.user);

      gate.hidden = true;
      document.body.classList.remove('is-locked');
      openShop();
      toast(id + '님, 상호상회에 오신 것을 환영합니다', '🍳');
    });

    $('#logoutBtn').addEventListener('click', function () {
      state.user = null;
      try { localStorage.removeItem(KEY_USER); } catch (e) { /* noop */ }
      closeDrawers();
      idInput.value = '';
      pwInput.value = '';
      errorBox.textContent = '';
      gate.hidden = false;
      document.body.classList.add('is-locked');
      idInput.focus();
    });
  }

  function openShop() {
    $('#userName').textContent = state.user.id;
    state.wish = load(KEY_WISH, []);
    state.cart = load(KEY_CART, []);
    render();
    renderWish();
    renderCart();
    updateBadges();
  }

  /* =======================================================
     상품 목록 렌더링
     ======================================================= */

  function visibleProducts() {
    var list = PRODUCTS.slice();

    if (state.onlyWish) {
      list = list.filter(function (p) { return state.wish.indexOf(p.id) !== -1; });
    }
    if (state.category !== '전체') {
      list = list.filter(function (p) { return p.category === state.category; });
    }
    if (state.keyword) {
      var k = state.keyword.toLowerCase();
      list = list.filter(function (p) {
        return (p.name + ' ' + p.category + ' ' + p.brand).toLowerCase().indexOf(k) !== -1;
      });
    }

    if (state.sort === 'priceAsc') {
      list.sort(function (a, b) { return salePrice(a) - salePrice(b); });
    } else if (state.sort === 'priceDesc') {
      list.sort(function (a, b) { return salePrice(b) - salePrice(a); });
    } else if (state.sort === 'discount') {
      list.sort(function (a, b) { return b.discount - a.discount; });
    } else if (state.sort === 'rating') {
      list.sort(function (a, b) { return b.rating - a.rating; });
    }

    return list;
  }

  function cardHtml(p, index) {
    var sale = salePrice(p);
    var liked = state.wish.indexOf(p.id) !== -1;
    var inCart = state.cart.some(function (c) { return c.id === p.id; });

    return '' +
      '<article class="card" style="animation-delay:' + Math.min(index * 22, 420) + 'ms">' +
        '<div class="card__media">' +
          '<img class="card__img" src="' + p.image + '" alt="' + escapeHtml(p.name) + '" ' +
               'loading="lazy" onerror="this.onerror=null;this.src=\'' + fallbackImage(p.emoji) + '\'">' +
          '<span class="card__sale">' + p.discount + '%</span>' +
          '<span class="card__flag" data-flag="' + p.flag + '"' + (p.flag ? '' : ' hidden') + '>' +
            escapeHtml(p.flag) + '</span>' +
          '<button class="wish' + (liked ? ' is-on' : '') + '" data-wish="' + p.id + '" ' +
                  'aria-label="찜하기" title="찜하기">' + (liked ? '❤️' : '🤍') + '</button>' +
        '</div>' +
        '<div class="card__body">' +
          '<div class="card__cat">' + escapeHtml(p.brand) + '</div>' +
          '<h3 class="card__name">' + escapeHtml(p.name) + '</h3>' +
          '<div class="card__rating">' +
            '<span class="stars">' + stars(p.rating) + '</span>' +
            '<span>' + p.rating.toFixed(1) + ' (' + p.reviews + ')</span>' +
          '</div>' +
          '<div class="card__price">' +
            '<div class="card__was">' + won(p.price) + '원</div>' +
            '<div class="card__now">' +
              '<span class="card__pct">' + p.discount + '%</span>' +
              '<span class="card__amt">' + won(sale) + '<small>원</small></span>' +
            '</div>' +
          '</div>' +
          '<button class="card__cta' + (inCart ? ' is-added' : '') + '" data-add="' + p.id + '">' +
            (inCart ? '✓ 담김 · 추가' : '장바구니 담기') +
          '</button>' +
        '</div>' +
      '</article>';
  }

  function render() {
    var list = visibleProducts();
    var grid = $('#grid');

    if (!list.length) {
      grid.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon">🍽️</div>' +
          '<p class="empty__title">조건에 맞는 상품이 없습니다</p>' +
          '<p class="empty__desc">검색어나 카테고리를 바꿔보세요.</p>' +
        '</div>';
    } else {
      grid.innerHTML = list.map(cardHtml).join('');
    }

    $('#resultCount').innerHTML = '총 <b>' + list.length + '</b>개 상품';

    var title = $('#listTitle');
    if (state.onlyWish) title.textContent = '내가 찜한 상품';
    else if (state.category !== '전체') title.textContent = state.category;
    else title.textContent = '오늘의 주방 특가';
  }

  /* =======================================================
     찜하기
     ======================================================= */

  function toggleWish(id) {
    var i = state.wish.indexOf(id);
    var p = findProduct(id);

    if (i === -1) {
      state.wish.push(id);
      toast(p.name + ' 찜했어요', '❤️');
    } else {
      state.wish.splice(i, 1);
      toast('찜 목록에서 뺐어요', '🤍');
    }

    save(KEY_WISH, state.wish);
    render();
    renderWish();
    updateBadges();
  }

  function renderWish() {
    var body = $('#wishBody');
    var items = state.wish.map(findProduct).filter(Boolean);

    if (!items.length) {
      body.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon">🤍</div>' +
          '<p class="empty__title">찜한 상품이 없습니다</p>' +
          '<p class="empty__desc">마음에 드는 상품의 하트를 눌러보세요.</p>' +
        '</div>';
    } else {
      body.innerHTML = items.map(function (p) {
        return '' +
          '<div class="line">' +
            '<img class="line__img" src="' + p.image + '" alt="" loading="lazy" ' +
                 'onerror="this.onerror=null;this.src=\'' + fallbackImage(p.emoji) + '\'">' +
            '<div class="line__info">' +
              '<p class="line__name">' + escapeHtml(p.name) + '</p>' +
              '<div class="line__meta">' + escapeHtml(p.category) + ' · ' + p.discount + '% 할인</div>' +
              '<div class="line__price"><s>' + won(p.price) + '원</s>' + won(salePrice(p)) + '원</div>' +
              '<button class="line__add" data-add="' + p.id + '">장바구니 담기</button>' +
            '</div>' +
            '<button class="line__del" data-wish="' + p.id + '" aria-label="찜 해제">✕</button>' +
          '</div>';
      }).join('');
    }

    $('#wishCountLabel').textContent = items.length;
  }

  /* =======================================================
     장바구니
     ======================================================= */

  function addToCart(id) {
    var row = null;
    for (var i = 0; i < state.cart.length; i++) {
      if (state.cart[i].id === id) { row = state.cart[i]; break; }
    }

    if (row) row.qty += 1;
    else state.cart.push({ id: id, qty: 1 });

    save(KEY_CART, state.cart);
    render();
    renderCart();
    updateBadges();
    toast(findProduct(id).name + ' 담았어요', '🛒');
  }

  function changeQty(id, delta) {
    for (var i = 0; i < state.cart.length; i++) {
      if (state.cart[i].id === id) {
        state.cart[i].qty += delta;
        if (state.cart[i].qty < 1) state.cart.splice(i, 1);
        break;
      }
    }
    save(KEY_CART, state.cart);
    render();
    renderCart();
    updateBadges();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(function (c) { return c.id !== id; });
    save(KEY_CART, state.cart);
    render();
    renderCart();
    updateBadges();
    toast('장바구니에서 뺐어요', '🗑️');
  }

  function cartTotals() {
    var listPrice = 0, payPrice = 0, count = 0;

    state.cart.forEach(function (row) {
      var p = findProduct(row.id);
      if (!p) return;
      listPrice += p.price * row.qty;
      payPrice += salePrice(p) * row.qty;
      count += row.qty;
    });

    // 5만원 이상 무료배송, 미만은 3,000원
    var ship = (payPrice === 0 || payPrice >= 50000) ? 0 : 3000;

    return {
      listPrice: listPrice,
      payPrice: payPrice,
      saved: listPrice - payPrice,
      ship: ship,
      total: payPrice + ship,
      count: count
    };
  }

  function renderCart() {
    var body = $('#cartBody');
    var rows = state.cart.map(function (row) {
      var p = findProduct(row.id);
      return p ? { p: p, qty: row.qty } : null;
    }).filter(Boolean);

    if (!rows.length) {
      body.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon">🛒</div>' +
          '<p class="empty__title">장바구니가 비어 있습니다</p>' +
          '<p class="empty__desc">오늘의 특가 상품을 담아보세요.</p>' +
        '</div>';
    } else {
      body.innerHTML = rows.map(function (r) {
        var p = r.p;
        return '' +
          '<div class="line">' +
            '<img class="line__img" src="' + p.image + '" alt="" loading="lazy" ' +
                 'onerror="this.onerror=null;this.src=\'' + fallbackImage(p.emoji) + '\'">' +
            '<div class="line__info">' +
              '<p class="line__name">' + escapeHtml(p.name) + '</p>' +
              '<div class="line__meta">' + escapeHtml(p.category) + ' · ' + p.discount + '% 할인</div>' +
              '<div class="line__price"><s>' + won(p.price) + '원</s>' +
                won(salePrice(p) * r.qty) + '원</div>' +
              '<div class="qty">' +
                '<button class="qty__btn" data-qty="-1" data-id="' + p.id + '" aria-label="수량 감소">−</button>' +
                '<span class="qty__num">' + r.qty + '</span>' +
                '<button class="qty__btn" data-qty="1" data-id="' + p.id + '" aria-label="수량 증가">+</button>' +
              '</div>' +
            '</div>' +
            '<button class="line__del" data-del="' + p.id + '" aria-label="삭제">✕</button>' +
          '</div>';
      }).join('');
    }

    var t = cartTotals();
    $('#sumList').textContent = won(t.listPrice) + '원';
    $('#sumSave').textContent = '-' + won(t.saved) + '원';
    $('#sumShip').textContent = t.ship === 0 ? '무료' : won(t.ship) + '원';
    $('#sumTotal').innerHTML = '<b>' + won(t.total) + '</b>원';
    $('#cartCountLabel').textContent = t.count;

    var note = $('#shipNote');
    if (t.payPrice === 0) {
      note.textContent = '5만원 이상 구매 시 배송비가 무료입니다.';
    } else if (t.ship === 0) {
      note.textContent = '무료배송 조건을 충족했습니다.';
    } else {
      note.textContent = won(50000 - t.payPrice) + '원 더 담으면 무료배송!';
    }
  }

  function updateBadges() {
    var cartCount = state.cart.reduce(function (n, c) { return n + c.qty; }, 0);
    var wishBadge = $('#wishBadge');
    var cartBadge = $('#cartBadge');

    wishBadge.textContent = state.wish.length;
    wishBadge.setAttribute('data-count', state.wish.length);
    cartBadge.textContent = cartCount;
    cartBadge.setAttribute('data-count', cartCount);
  }

  /* =======================================================
     드로어 (찜 목록 / 장바구니)
     ======================================================= */

  function openDrawer(which) {
    closeDrawers();
    $('#' + which + 'Drawer').classList.add('is-open');
    $('#scrim').classList.add('is-open');
    document.body.classList.add('is-locked');
  }

  function closeDrawers() {
    $$('.drawer').forEach(function (d) { d.classList.remove('is-open'); });
    $('#scrim').classList.remove('is-open');
    if (!$('#gate').hidden) return;
    document.body.classList.remove('is-locked');
  }

  /* =======================================================
     이벤트 바인딩
     ======================================================= */

  function initEvents() {
    // 카드 / 드로어 내부의 모든 클릭을 한 곳에서 처리
    document.addEventListener('click', function (e) {
      var wishBtn = e.target.closest('[data-wish]');
      if (wishBtn) { toggleWish(Number(wishBtn.dataset.wish)); return; }

      var addBtn = e.target.closest('[data-add]');
      if (addBtn) { addToCart(Number(addBtn.dataset.add)); return; }

      var qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) { changeQty(Number(qtyBtn.dataset.id), Number(qtyBtn.dataset.qty)); return; }

      var delBtn = e.target.closest('[data-del]');
      if (delBtn) { removeFromCart(Number(delBtn.dataset.del)); return; }
    });

    // 카테고리 필터
    $('#chips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      state.category = chip.dataset.cat;
      state.onlyWish = false;
      $$('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      render();
    });

    // 검색
    var searchTimer;
    $('#searchInput').addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      var value = e.target.value.trim();
      searchTimer = setTimeout(function () {
        state.keyword = value;
        render();
      }, 160);
    });

    // 정렬
    $('#sortSelect').addEventListener('change', function (e) {
      state.sort = e.target.value;
      render();
    });

    // 드로어 열기 / 닫기
    $('#wishBtn').addEventListener('click', function () { openDrawer('wish'); });
    $('#cartBtn').addEventListener('click', function () { openDrawer('cart'); });
    $('#scrim').addEventListener('click', closeDrawers);
    $$('.drawer__close').forEach(function (b) { b.addEventListener('click', closeDrawers); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawers();
    });

    // 찜 목록 전체 보기
    $('#viewWishAll').addEventListener('click', function () {
      state.onlyWish = true;
      state.category = '전체';
      $$('.chip').forEach(function (c) { c.classList.toggle('is-active', c.dataset.cat === '전체'); });
      closeDrawers();
      render();
      $('#listTop').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 주문하기 (데모)
    $('#checkoutBtn').addEventListener('click', function () {
      if (!state.cart.length) { toast('장바구니가 비어 있습니다', '🛒'); return; }
      var t = cartTotals();
      toast('총 ' + won(t.total) + '원 주문이 접수되었습니다', '🧾');
      state.cart = [];
      save(KEY_CART, state.cart);
      render();
      renderCart();
      updateBadges();
      setTimeout(closeDrawers, 700);
    });
  }

  /* =======================================================
     시작
     ======================================================= */

  function initStats() {
    var maxDiscount = Math.max.apply(null, PRODUCTS.map(function (p) { return p.discount; }));
    $('#statCount').textContent = PRODUCTS.length;
    $('#statDiscount').textContent = maxDiscount + '%';
  }

  function initCategories() {
    var cats = ['전체'];
    PRODUCTS.forEach(function (p) {
      if (cats.indexOf(p.category) === -1) cats.push(p.category);
    });
    $('#chips').innerHTML = cats.map(function (c, i) {
      return '<button class="chip' + (i === 0 ? ' is-active' : '') + '" data-cat="' + c + '">' +
        escapeHtml(c) + '</button>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    toastBox = $('#toasts');
    initStats();
    initCategories();
    initEvents();
    initAuth();
  });
})();
