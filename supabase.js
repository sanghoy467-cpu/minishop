/* =========================================================
   상호상회 — Supabase 연동 계층

   · 아래 두 값은 브라우저에 공개되어도 안전한 값입니다.
     publishable(anon) 키는 RLS 정책을 통과하는 요청만 수행할 수 있습니다.
   · DB 직결 문자열(postgresql://...)이나 secret 키는 절대 이 파일에
     넣지 마세요. 정적 사이트의 모든 코드는 방문자에게 공개됩니다.

   테이블 / 정책은 supabase/schema.sql 을 참고하세요.
   ========================================================= */

var SUPABASE_URL = 'https://eckvbgfyucgzumbruchv.supabase.co';
var SUPABASE_KEY = 'sb_publishable_Ck9_JKYfTl7oj4CxHSVeSQ_rN9jfBS0';

var DB = (function () {
  'use strict';

  // supabase-js 가 로드되지 않았으면(오프라인 등) 연결 없이 동작합니다.
  var client = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) {
    client = null;
  }

  /** 화면에 보여줄 이름 — 이메일의 @ 앞부분을 씁니다. */
  function usernameOf(user) {
    if (!user) return null;
    if (user.user_metadata && user.user_metadata.username) return user.user_metadata.username;
    return String(user.email || '').split('@')[0];
  }

  /**
   * Supabase 가 돌려준 영문 오류를 한국어 안내로 바꿉니다.
   * 코드가 바뀌어도 동작하도록 error_code 와 메시지를 함께 확인합니다.
   */
  function describeError(error, fallback) {
    if (!error) return fallback;
    var code = String(error.code || error.error_code || '');
    var msg = String(error.message || error.msg || '');

    // --- 회원가입 ---
    if (code === 'user_already_exists' || code === 'email_exists' ||
        /already registered|already been registered/i.test(msg)) {
      return '이미 가입된 이메일입니다. 로그인해 주세요.';
    }
    if (code === 'validation_failed' || /invalid format|unable to validate email/i.test(msg)) {
      return '이메일 형식이 올바르지 않습니다. 예) name@example.com';
    }
    if (code === 'weak_password' || /at least 6|password should be/i.test(msg)) {
      return '비밀번호는 6자 이상 입력해 주세요.';
    }
    if (code === 'signup_disabled' || /signups not allowed|signup is disabled/i.test(msg)) {
      return '현재 회원가입이 중단되어 있습니다.';
    }
    if (code === 'email_address_not_authorized' || /not authorized/i.test(msg)) {
      return '이 이메일 주소로는 가입할 수 없습니다.';
    }

    // --- 로그인 ---
    if (code === 'invalid_credentials' || /invalid login/i.test(msg)) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
      return '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요.';
    }

    // --- 공통 ---
    if (/rate limit|too many requests/i.test(msg) || code === '429') {
      return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (/failed to fetch|networkerror|network request failed/i.test(msg)) {
      return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.';
    }

    return fallback || msg || '알 수 없는 오류가 발생했습니다.';
  }

  return {
    /** Supabase 를 쓸 수 있는 상태인지 */
    get online() { return !!client; },

    describeError: describeError,

    /* ------------------------------------------------- 인증 ------------- */
    auth: {
      /** 현재 로그인한 사용자 ({ id, uid }) 또는 null */
      current: function () {
        if (!client) return Promise.resolve(null);
        return client.auth.getUser().then(function (res) {
          var user = res && res.data && res.data.user;
          return user ? { id: usernameOf(user), uid: user.id } : null;
        }).catch(function () { return null; });
      },

      /**
       * 회원가입 (이메일 + 비밀번호)
       * @returns {Promise<{user:?{id,uid}, needsConfirm:boolean, email:string}>}
       *   needsConfirm 이 true 면 이메일 인증이 필요해 아직 로그인되지 않은 상태입니다.
       */
      signUp: function (email, password) {
        if (!client) return Promise.reject(new Error('offline'));
        var addr = String(email).trim();
        return client.auth.signUp({ email: addr, password: password })
          .then(function (res) {
            if (res.error) throw res.error;

            // 이 프로젝트는 자동 확인이 켜져 있어 보통 바로 세션이 생깁니다.
            // 확인 메일 설정이 켜진 경우에는 세션 없이 성공할 수 있습니다.
            if (!res.data.session) {
              return { user: null, needsConfirm: true, email: addr };
            }
            return {
              user: { id: usernameOf(res.data.user), uid: res.data.user.id },
              needsConfirm: false,
              email: addr
            };
          });
      },

      /** 로그인 (이메일 + 비밀번호) */
      signIn: function (email, password) {
        if (!client) return Promise.reject(new Error('offline'));
        return client.auth.signInWithPassword({
          email: String(email).trim(),
          password: password
        }).then(function (res) {
          if (res.error) throw res.error;
          return { id: usernameOf(res.data.user), uid: res.data.user.id };
        });
      },

      /** 로그아웃 */
      signOut: function () {
        if (!client) return Promise.resolve();
        return client.auth.signOut().catch(function () { /* 무시 */ });
      }
    },

    /* ------------------------------------------------- 상품 ------------- */
    products: {
      /** 상품 목록을 DB 에서 읽어옵니다. 실패하면 null 을 돌려줍니다. */
      list: function () {
        if (!client) return Promise.resolve(null);
        return client
          .from('products')
          .select('id,name,category,brand,price,discount,rating,reviews,flag,emoji,image')
          .order('id', { ascending: true })
          .then(function (res) {
            if (res.error || !res.data || !res.data.length) return null;
            // rating 이 문자열("4.8")로 올 수 있어 숫자로 맞춰 둡니다.
            return res.data.map(function (p) {
              p.rating = Number(p.rating);
              return p;
            });
          })
          .catch(function () { return null; });
      }
    },

    /* ------------------------------------------------- 주문 ------------- */
    orders: {
      /**
       * 주문을 저장합니다.
       * @param {object} order { order_no, user_id, buyer_type, buyer_name, buyer_phone, items, total }
       */
      create: function (order) {
        if (!client) return Promise.reject(new Error('offline'));
        return client.from('orders').insert(order).then(function (res) {
          if (res.error) throw res.error;
          return true;
        });
      },

      /** 로그인한 회원의 주문 내역 (RLS 로 본인 것만 조회됩니다) */
      listMine: function () {
        if (!client) return Promise.resolve([]);
        return client
          .from('orders')
          .select('order_no,buyer_name,items,total,created_at')
          .order('created_at', { ascending: false })
          .limit(30)
          .then(function (res) {
            if (res.error) return [];
            return res.data || [];
          })
          .catch(function () { return []; });
      }
    }
  };
})();
