/* =========================================================
   상호상회 — 애플리케이션 로직

   · 사이트는 로그인 없이 누구나 둘러볼 수 있습니다.
   · 찜 / 장바구니도 비회원 상태에서 그대로 쓸 수 있습니다.
   · 로그인은 주문 단계에서만 선택적으로 요구하며,
     로그인 대신 "비회원 주문"으로도 주문을 마칠 수 있습니다.
   · 회원 정보와 주문 내역은 서버 없이 localStorage 에만 저장됩니다.
   ========================================================= */

(function () {
  'use strict';

  // ------------------------------------------------------- 저장소 키
  var KEY_USER   = 'sangho.user';    // 현재 로그인한 사용자
  var KEY_USERS  = 'sangho.users';   // 가입한 회원 목록
  var KEY_WISH   = 'sangho.wish';
  var KEY_CART   = 'sangho.cart';
  var KEY_ORDERS = 'sangho.orders';

  // ------------------------------------------------------- 상태
  var state = {
    user: null,        // null 이면 비회원(둘러보기) 상태
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

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* noop */ }
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
     모달 공통
     ======================================================= */

  function openModal(id) {
    closeModals();
    $('#' + id).hidden = false;
    document.body.classList.add('is-locked');
  }

  function closeModals() {
    $$('.modal').forEach(function (m) { m.hidden = true; });
    if (!$$('.drawer.is-open').length) document.body.classList.remove('is-locked');
  }

  /* =======================================================
     회원 관리 (회원가입 / 로그인 / 로그아웃)

     데모용이라 비밀번호를 평문으로 저장합니다.
     실제 서비스라면 서버에서 해시하여 보관해야 합니다.
     ======================================================= */

  /** 가입 회원이 하나도 없으면 체험용 계정을 하나 만들어 둡니다. */
  function seedDemoUser() {
    var users = load(KEY_USERS, null);
    if (!users || !users.length) {
      save(KEY_USERS, [{ id: 'guest', pw: '1234', joined: new Date().toISOString() }]);
    }
  }

  function getUsers() { return load(KEY_USERS, []); }

  function findUser(id) {
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].id.toLowerCase() === id.toLowerCase()) return users[i];
    }
    return null;
  }

  function signIn(user, welcomeMessage) {
    state.user = { id: user.id, since: new Date().toISOString() };
    save(KEY_USER, state.user);
    renderAuthBar();
    closeModals();
    toast(welcomeMessage || (user.id + '님, 환영합니다'), '🍳');

    // 주문하려다 로그인한 경우라면 그대로 주문을 이어서 진행합니다.
    if (pendingCheckout) {
      pendingCheckout = false;
      setTimeout(placeOrder, 420);
    }
  }

  function initAuth() {
    seedDemoUser();
    state.user = load(KEY_USER, null);
    renderAuthBar();

    // --- 탭 전환 ---
    $$('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });
    $$('[data-tab-go]').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tabGo); });
    });

    // --- 로그인 ---
    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var id = $('#loginId').value.trim();
      var pw = $('#loginPw').value;
      var err = $('#loginError');

      if (!id) { err.textContent = '아이디를 입력해 주세요.'; $('#loginId').focus(); return; }
      if (!pw) { err.textContent = '비밀번호를 입력해 주세요.'; $('#loginPw').focus(); return; }

      var user = findUser(id);
      if (!user) {
        err.innerHTML = '가입되지 않은 아이디입니다. 회원가입을 먼저 해주세요.';
        $('#loginId').focus();
        return;
      }
      if (user.pw !== pw) {
        err.textContent = '비밀번호가 일치하지 않습니다.';
        $('#loginPw').select();
        return;
      }

      err.textContent = '';
      $('#loginPw').value = '';
      signIn(user, user.id + '님, 상호상회에 오신 것을 환영합니다');
    });

    // --- 회원가입 ---
    $('#signupForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var id  = $('#signupId').value.trim();
      var pw  = $('#signupPw').value;
      var pw2 = $('#signupPw2').value;
      var err = $('#signupError');

      if (id.length < 3) {
        err.textContent = '아이디는 3자 이상 입력해 주세요.';
        $('#signupId').focus(); return;
      }
      if (/\s/.test(id)) {
        err.textContent = '아이디에는 공백을 쓸 수 없습니다.';
        $('#signupId').focus(); return;
      }
      if (findUser(id)) {
        err.textContent = '이미 사용 중인 아이디입니다.';
        $('#signupId').select(); return;
      }
      if (pw.length < 4) {
        err.textContent = '비밀번호는 4자 이상 입력해 주세요.';
        $('#signupPw').focus(); return;
      }
      if (pw !== pw2) {
        err.textContent = '비밀번호가 서로 일치하지 않습니다.';
        $('#signupPw2').select(); return;
      }

      var users = getUsers();
      var user = { id: id, pw: pw, joined: new Date().toISOString() };
      users.push(user);
      save(KEY_USERS, users);

      err.textContent = '';
      $('#signupPw').value = '';
      $('#signupPw2').value = '';
      signIn(user, '가입 완료! ' + id + '님 환영합니다');
    });

    // --- 로그아웃 ---
    $('#logoutBtn').addEventListener('click', function () {
      state.user = null;
      remove(KEY_USER);
      renderAuthBar();
      toast('로그아웃되었습니다. 둘러보기는 계속 가능해요', '👋');
    });

    // --- 모달 열기 버튼 (헤더 / 상단바 / 주문 선택지) ---
    $$('[data-auth-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAuth(btn.dataset.authOpen);
      });
    });

    // --- 모달 닫기 ---
    $$('[data-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pendingCheckout = false;
        closeModals();
      });
    });
  }

  function openAuth(tab) {
    switchTab(tab || 'login');
    openModal('authModal');
    setTimeout(function () {
      $(tab === 'signup' ? '#signupId' : '#loginId').focus();
    }, 140);
  }

  function switchTab(tab) {
    var isSignup = tab === 'signup';
    $('#tabLogin').classList.toggle('is-active', !isSignup);
    $('#tabSignup').classList.toggle('is-active', isSignup);
    $('#loginForm').hidden = isSignup;
    $('#signupForm').hidden = !isSignup;
    $('#loginError').textContent = '';
    $('#signupError').textContent = '';
  }

  /** 상단바 · 헤더의 로그인 상태 표시를 갱신합니다. */
  function renderAuthBar() {
    var signedIn = !!state.user;

    $('#topbarGuest').hidden = signedIn;
    $('#topbarUser').hidden = !signedIn;
    if (signedIn) $('#userName').textContent = state.user.id;

    var btn = $('#headerAuthBtn');
    if (signedIn) {
      btn.querySelector('.label').textContent = state.user.id;
      btn.querySelector('.icon-btn__emoji').textContent = '🍳';
      btn.classList.remove('icon-btn--accent');
    } else {
      btn.querySelector('.label').textContent = '로그인';
      btn.querySelector('.icon-btn__emoji').textContent = '👤';
      btn.classList.add('icon-btn--accent');
    }

    $('#checkoutNote').textContent = signedIn
      ? state.user.id + '님 계정으로 주문합니다.'
      : '로그인 없이 비회원으로도 주문할 수 있어요.';
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
     찜하기 (비회원도 사용 가능)
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
     장바구니 (비회원도 사용 가능)
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
     주문
     로그인 상태면 바로 주문, 아니면 주문 방식을 먼저 고릅니다.
     ======================================================= */

  var pendingCheckout = false;   // 로그인 후 이어서 주문할지 여부

  function startCheckout() {
    if (!state.cart.length) {
      toast('장바구니가 비어 있습니다', '🛒');
      return;
    }

    if (state.user) {          // 회원 — 바로 주문
      placeOrder();
      return;
    }

    // 비회원 — 주문 방식 선택
    pendingCheckout = true;
    $('#orderChoice').hidden = false;
    $('#guestForm').hidden = true;
    $('#orderAmount').textContent = won(cartTotals().total) + '원';
    closeDrawers();
    openModal('orderModal');
  }

  function orderNumber() {
    var d = new Date();
    var ymd = String(d.getFullYear()).slice(2) +
              ('0' + (d.getMonth() + 1)).slice(-2) +
              ('0' + d.getDate()).slice(-2);
    return 'SH' + ymd + '-' + String(Math.floor(Math.random() * 9000) + 1000);
  }

  /**
   * 주문을 확정합니다.
   * @param {{name:string, phone:string}=} guest 비회원 주문자 정보 (회원 주문이면 생략)
   */
  function placeOrder(guest) {
    var t = cartTotals();
    if (!t.count) { toast('장바구니가 비어 있습니다', '🛒'); return; }

    var no = orderNumber();
    var orders = load(KEY_ORDERS, []);
    orders.push({
      no: no,
      at: new Date().toISOString(),
      buyer: guest ? { type: 'guest', name: guest.name, phone: guest.phone }
                   : { type: 'member', id: state.user.id },
      items: state.cart.slice(),
      total: t.total
    });
    save(KEY_ORDERS, orders);

    // 장바구니 비우기
    state.cart = [];
    save(KEY_CART, state.cart);
    pendingCheckout = false;
    render();
    renderCart();
    updateBadges();
    closeDrawers();

    $('#doneDesc').innerHTML =
      (guest ? escapeHtml(guest.name) + '님 (비회원 주문)' : escapeHtml(state.user.id) + '님') +
      '<br>결제 예정 금액 <b>' + won(t.total) + '원</b>';
    $('#doneOrderNo').textContent = no;
    openModal('doneModal');
  }

  function initCheckout() {
    $('#checkoutBtn').addEventListener('click', startCheckout);

    // 비회원 주문 — 정보 입력 단계로
    $('#guestOrderBtn').addEventListener('click', function () {
      $('#orderChoice').hidden = true;
      $('#guestForm').hidden = false;
      setTimeout(function () { $('#guestName').focus(); }, 120);
    });

    // 비회원 주문 확정
    $('#guestForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var name  = $('#guestName').value.trim();
      var phone = $('#guestPhone').value.trim();
      var err   = $('#guestError');

      if (!name) { err.textContent = '받는 분 이름을 입력해 주세요.'; $('#guestName').focus(); return; }
      if (!phone) { err.textContent = '연락처를 입력해 주세요.'; $('#guestPhone').focus(); return; }
      if (phone.replace(/[^0-9]/g, '').length < 9) {
        err.textContent = '연락처를 정확히 입력해 주세요.';
        $('#guestPhone').select(); return;
      }

      err.textContent = '';
      closeModals();
      placeOrder({ name: name, phone: phone });
    });
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
    if ($$('.modal:not([hidden])').length) return;   // 모달이 열려 있으면 스크롤 잠금 유지
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
      if (e.key !== 'Escape') return;
      if ($$('.modal:not([hidden])').length) { pendingCheckout = false; closeModals(); }
      else closeDrawers();
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

    state.wish = load(KEY_WISH, []);
    state.cart = load(KEY_CART, []);

    initStats();
    initCategories();
    initEvents();
    initAuth();
    initCheckout();

    render();
    renderWish();
    renderCart();
    updateBadges();
  });
})();
