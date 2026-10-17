/* =========================================================
   삼환 물류(주) — 애플리케이션 로직

   · 사이트는 로그인 없이 누구나 둘러볼 수 있습니다.
   · 찜 / 장바구니도 비회원 상태에서 그대로 쓸 수 있습니다.
   · 로그인은 주문 단계에서만 선택적으로 요구하며,
     로그인 대신 "비회원 주문"으로도 주문을 마칠 수 있습니다.
   · 회원 정보와 주문 내역은 서버 없이 localStorage 에만 저장됩니다.
   ========================================================= */

(function () {
  'use strict';

  // ------------------------------------------------------- 저장소 키
  // 회원 / 주문은 Supabase 가 보관하고, 찜 / 장바구니만 이 브라우저에 둡니다.
  var KEY_WISH  = 'sangho.wish';
  var KEY_CART  = 'sangho.cart';

  // 아래 두 키는 Supabase 연동 이전 버전이 쓰던 것으로, 첫 실행 때 정리합니다.
  var KEY_USER  = 'sangho.user';
  var KEY_USERS = 'sangho.users';

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
      'font-family="sans-serif">삼환 물류(주)</text></svg>';
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

     인증은 Supabase Auth 가 처리합니다 — 비밀번호는 이 브라우저에
     저장되지 않고, 가입한 계정은 어느 기기에서나 쓸 수 있습니다.
     이 상점은 이메일 대신 아이디로 가입하므로, supabase.js 에서
     아이디를 내부 전용 주소로 변환해 Supabase 에 전달합니다.
     ======================================================= */

  /** 로그인 성공 후 공통 처리 */
  function signedIn(user, welcomeMessage) {
    state.user = user;                       // { id, uid }
    renderAuthBar();
    closeModals();
    toast(welcomeMessage || (user.id + '님, 환영합니다'), '🥤');

    // 주문하려다 로그인한 경우라면 그대로 주문을 이어서 진행합니다.
    if (pendingCheckout) {
      pendingCheckout = false;
      setTimeout(function () { placeOrder(); }, 420);
    }
  }

  /** 제출 중에는 버튼을 잠가 중복 요청을 막습니다. */
  function busy(form, on, label) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.textContent;
      btn.textContent = label || '처리 중…';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.label || btn.textContent;
      btn.disabled = false;
    }
  }

  function initAuth() {
    // 이전 버전에서 브라우저에만 저장하던 회원 정보는 더 이상 쓰지 않습니다.
    remove(KEY_USERS);
    remove(KEY_USER);

    // 저장된 세션이 있으면 자동 로그인
    DB.auth.current().then(function (user) {
      if (user) { state.user = user; renderAuthBar(); }
    });

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
      var form = e.target;
      var email = $('#loginEmail').value.trim();
      var pw = $('#loginPw').value;
      var err = $('#loginError');

      if (!email) {
        err.textContent = '이메일을 입력해 주세요.';
        $('#loginEmail').focus(); return;
      }
      if (!isEmail(email)) {
        err.textContent = '이메일 형식이 올바르지 않습니다. 예) name@example.com';
        $('#loginEmail').select(); return;
      }
      if (!pw) {
        err.textContent = '비밀번호를 입력해 주세요.';
        $('#loginPw').focus(); return;
      }
      if (!DB.online) {
        err.textContent = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'; return;
      }

      err.textContent = '';
      busy(form, true, '로그인 중…');

      DB.auth.signIn(email, pw).then(function (user) {
        $('#loginPw').value = '';
        busy(form, false);
        signedIn(user, user.id + '님, 삼환 물류(주)에 오신 것을 환영합니다');
      }).catch(function (error) {
        busy(form, false);
        err.textContent = DB.describeError(error, '로그인에 실패했습니다.');
        $('#loginPw').select();
      });
    });

    // --- 회원가입 ---
    $('#signupForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var form  = e.target;
      var email = $('#signupEmail').value.trim();
      var pw    = $('#signupPw').value;
      var pw2   = $('#signupPw2').value;
      var err   = $('#signupError');

      // 서버에 보내기 전에 걸러낼 수 있는 것은 먼저 안내합니다.
      if (!email) {
        err.textContent = '이메일을 입력해 주세요.';
        $('#signupEmail').focus(); return;
      }
      if (!isEmail(email)) {
        err.textContent = '이메일 형식이 올바르지 않습니다. 예) name@example.com';
        $('#signupEmail').select(); return;
      }
      if (!pw) {
        err.textContent = '비밀번호를 입력해 주세요.';
        $('#signupPw').focus(); return;
      }
      if (pw.length < 6) {
        err.textContent = '비밀번호는 6자 이상 입력해 주세요.';
        $('#signupPw').focus(); return;
      }
      if (pw !== pw2) {
        err.textContent = '비밀번호가 서로 일치하지 않습니다.';
        $('#signupPw2').select(); return;
      }
      if (!DB.online) {
        err.textContent = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'; return;
      }

      err.textContent = '';
      busy(form, true, '가입 중…');

      DB.auth.signUp(email, pw).then(function (result) {
        $('#signupPw').value = '';
        $('#signupPw2').value = '';
        busy(form, false);
        showSignupDone(result);
      }).catch(function (error) {
        busy(form, false);
        err.textContent = DB.describeError(error, '회원가입에 실패했습니다.');
      });
    });

    // --- 가입 완료 화면의 "쇼핑 시작하기" ---
    $('#signupDoneBtn').addEventListener('click', function () {
      var user = $('#signupDoneBtn').dataset.uid
        ? { id: $('#signupDoneBtn').dataset.name, uid: $('#signupDoneBtn').dataset.uid }
        : null;

      if (user) {
        signedIn(user, user.id + '님, 삼환 물류(주)에 오신 것을 환영합니다');
      } else {
        // 이메일 인증이 필요한 경우 — 로그인 탭으로 보냅니다.
        switchTab('login');
      }
    });

    // --- 로그아웃 ---
    $('#logoutBtn').addEventListener('click', function () {
      DB.auth.signOut().then(function () {
        state.user = null;
        renderAuthBar();
        toast('로그아웃되었습니다. 둘러보기는 계속 가능해요', '👋');
      });
    });

    // --- 주문 내역 ---
    $('#ordersBtn').addEventListener('click', showMyOrders);

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

  /** 간단한 이메일 형식 검사 — 서버가 다시 한 번 검증합니다. */
  function isEmail(value) {
    return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
  }

  function openAuth(tab) {
    switchTab(tab || 'login');
    openModal('authModal');
    setTimeout(function () {
      $(tab === 'signup' ? '#signupEmail' : '#loginEmail').focus();
    }, 140);
  }

  function switchTab(tab) {
    var isSignup = tab === 'signup';
    $('#tabLogin').classList.toggle('is-active', !isSignup);
    $('#tabSignup').classList.toggle('is-active', isSignup);
    $('#loginForm').hidden = isSignup;
    $('#signupForm').hidden = !isSignup;
    $('#signupDone').hidden = true;          // 가입 완료 화면은 항상 접어둡니다
    $('.tabs').hidden = false;
    $('#loginError').textContent = '';
    $('#signupError').textContent = '';
  }

  /** 가입 성공 화면 — 폼 대신 완료 메시지를 보여줍니다. */
  function showSignupDone(result) {
    $('#loginForm').hidden = true;
    $('#signupForm').hidden = true;
    $('.tabs').hidden = true;
    $('#signupDone').hidden = false;

    var btn = $('#signupDoneBtn');

    if (result.needsConfirm) {
      // 이메일 인증 설정이 켜져 있는 경우
      $('#signupDoneDesc').innerHTML =
        escapeHtml(result.email) + ' 로<br>인증 메일을 보냈습니다. 메일을 확인해 주세요.';
      btn.textContent = '로그인하러 가기';
      delete btn.dataset.uid;
      delete btn.dataset.name;
    } else {
      $('#signupDoneDesc').innerHTML =
        '<b>' + escapeHtml(result.email) + '</b><br>이제 이 계정으로 어디서든 로그인할 수 있습니다.';
      btn.textContent = '쇼핑 시작하기';
      btn.dataset.uid = result.user.uid;
      btn.dataset.name = result.user.id;
    }
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
      btn.querySelector('.icon-btn__emoji').textContent = '🥤';
      btn.classList.remove('icon-btn--accent');
    } else {
      btn.querySelector('.label').textContent = '로그인';
      btn.querySelector('.icon-btn__emoji').textContent = '👤';
      btn.classList.add('icon-btn--accent');
    }

    // 주문 내역은 로그인한 회원에게만 보여줍니다.
    $('#ordersBtn').hidden = !signedIn;

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
   * 주문을 확정하고 Supabase 에 저장합니다.
   * @param {{name:string, phone:string}=} guest 비회원 주문자 정보 (회원 주문이면 생략)
   */
  function placeOrder(guest) {
    var t = cartTotals();
    if (!t.count) { toast('장바구니가 비어 있습니다', '🛒'); return; }
    if (!guest && !state.user) { startCheckout(); return; }

    // 주문 시점의 상품 정보를 함께 담아 둡니다.
    // (나중에 가격이 바뀌어도 주문 내역은 그대로 보존됩니다)
    var items = state.cart.map(function (row) {
      var p = findProduct(row.id);
      if (!p) return null;
      return {
        id: p.id, name: p.name, qty: row.qty,
        price: p.price, discount: p.discount, paid: salePrice(p) * row.qty
      };
    }).filter(Boolean);

    var no = orderNumber();
    var payload = guest
      ? { order_no: no, user_id: null, buyer_type: 'guest',
          buyer_name: guest.name, buyer_phone: guest.phone, items: items, total: t.total }
      : { order_no: no, user_id: state.user.uid, buyer_type: 'member',
          buyer_name: state.user.id, buyer_phone: null, items: items, total: t.total };

    toast('주문을 접수하고 있습니다…', '⏳');

    DB.orders.create(payload).then(function () {
      // 주문이 실제로 저장된 뒤에만 장바구니를 비웁니다.
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
    }).catch(function (error) {
      pendingCheckout = false;
      closeModals();
      toast(DB.describeError(error, '주문 저장에 실패했습니다. 다시 시도해 주세요.'), '⚠️');
    });
  }

  /* -------------------------------------------------------
     주문 내역 (회원 전용 — RLS 로 본인 주문만 조회됩니다)
     ------------------------------------------------------- */

  function showMyOrders() {
    if (!state.user) { openAuth('login'); return; }

    $('#ordersBody').innerHTML =
      '<p class="orders__loading">주문 내역을 불러오는 중…</p>';
    openModal('ordersModal');

    DB.orders.listMine().then(function (rows) {
      if (!rows.length) {
        $('#ordersBody').innerHTML =
          '<div class="empty">' +
            '<div class="empty__icon">🧾</div>' +
            '<p class="empty__title">아직 주문 내역이 없습니다</p>' +
            '<p class="empty__desc">마음에 드는 상품을 주문해 보세요.</p>' +
          '</div>';
        return;
      }

      $('#ordersBody').innerHTML = rows.map(function (o) {
        var when = new Date(o.created_at);
        var names = (o.items || []).map(function (it) {
          return escapeHtml(it.name) + (it.qty > 1 ? ' ×' + it.qty : '');
        });
        var head = names[0] || '상품';
        if (names.length > 1) head += ' 외 ' + (names.length - 1) + '건';

        return '' +
          '<div class="order">' +
            '<div class="order__top">' +
              '<b class="order__no">' + escapeHtml(o.order_no) + '</b>' +
              '<span class="order__date">' +
                when.getFullYear() + '.' + (when.getMonth() + 1) + '.' + when.getDate() +
              '</span>' +
            '</div>' +
            '<p class="order__items">' + head + '</p>' +
            '<p class="order__total">' + won(o.total) + '원</p>' +
          '</div>';
      }).join('');
    });
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

  function paint() {
    initStats();
    initCategories();
    render();
    renderWish();
    renderCart();
    updateBadges();
  }

  document.addEventListener('DOMContentLoaded', function () {
    toastBox = $('#toasts');

    state.wish = load(KEY_WISH, []);
    state.cart = load(KEY_CART, []);

    initEvents();
    initAuth();
    initCheckout();

    // 먼저 번들된 상품으로 즉시 그려서 빈 화면을 보이지 않게 하고,
    // Supabase 에서 최신 상품 목록이 오면 다시 그립니다.
    // (DB 가 비어 있거나 연결이 안 되면 번들 데이터를 그대로 씁니다)
    paint();

    DB.products.list().then(function (rows) {
      if (!rows) return;
      PRODUCTS = rows;
      paint();
    });
  });
})();
