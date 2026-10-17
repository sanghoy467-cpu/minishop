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

  /**
   * 이 상점은 이메일 대신 "아이디"로 가입합니다.
   * Supabase Auth 는 이메일을 요구하므로 아이디를 내부 전용 주소로 바꿔 씁니다.
   * (실제로 메일이 발송되지는 않습니다 — 프로젝트가 자동 확인 설정이라 가입 즉시 로그인됩니다)
   */
  function idToEmail(id) {
    return String(id).trim().toLowerCase() + '@minishop.local';
  }

  /** Supabase 사용자 객체에서 화면에 보여줄 아이디를 꺼냅니다. */
  function usernameOf(user) {
    if (!user) return null;
    if (user.user_metadata && user.user_metadata.username) return user.user_metadata.username;
    return String(user.email || '').split('@')[0];
  }

  /** Supabase 가 돌려준 영문 오류를 한국어 안내로 바꿉니다. */
  function describeError(error, fallback) {
    if (!error) return fallback;
    var code = error.code || error.error_code || '';
    var msg = String(error.message || '');

    if (code === 'user_already_exists' || /already registered/i.test(msg)) {
      return '이미 사용 중인 아이디입니다.';
    }
    if (code === 'invalid_credentials' || /invalid login/i.test(msg)) {
      return '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    if (code === 'weak_password' || /at least 6/i.test(msg)) {
      return '비밀번호는 6자 이상 입력해 주세요.';
    }
    if (code === 'over_email_send_rate_limit' || /rate limit/i.test(msg)) {
      return '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (/fetch|network/i.test(msg)) {
      return '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.';
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

      /** 회원가입 — 성공 시 그대로 로그인 상태가 됩니다. */
      signUp: function (id, password) {
        if (!client) return Promise.reject(new Error('offline'));
        return client.auth.signUp({
          email: idToEmail(id),
          password: password,
          options: { data: { username: id } }
        }).then(function (res) {
          if (res.error) throw res.error;
          if (!res.data.session) {
            // 이메일 확인이 켜져 있는 프로젝트라면 세션이 없을 수 있습니다.
            throw new Error('가입은 되었지만 자동 로그인에 실패했습니다. 로그인 탭에서 로그인해 주세요.');
          }
          return { id: id, uid: res.data.user.id };
        });
      },

      /** 로그인 */
      signIn: function (id, password) {
        if (!client) return Promise.reject(new Error('offline'));
        return client.auth.signInWithPassword({
          email: idToEmail(id),
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
