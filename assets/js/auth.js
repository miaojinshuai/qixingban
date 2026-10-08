/* ============================================================
   七星班班级网站 · 登录与访问控制
   ------------------------------------------------------------
   角色与权限：
     guest 游客      —— 只能看首页（index.html），其余页面显示「请登录」
     head  班主任    —— 全部页面完整可见（账号 马志豪 / admin）
     student 学生    —— 只能看本人成长与自查两页（账号 李世博）
     teacher 任课教师 —— 当前未开放，登录按钮无响应
   未登录访问任何页面都会转到 login.html。
   登录态存 localStorage，点「退出」即清除。
   ============================================================ */
window.QXAuth = (function () {
  'use strict';

  var KEY = 'qx_auth_v1';
  var LOGIN_PAGE = 'login.html';

  /* 各角色可访问的页面（'' 为站点根目录）。head 通配全部页面，不在此表内。 */
  var ROLE_PAGES = {
    guest: ['index.html', ''],
    student: ['student.html', 'growth.html']
  };

  /* 角色开放开关：置 false 时登录页点击无响应 */
  var ENABLED = { guest: true, head: true, teacher: false, student: true };

  var ROLE_LABEL = { guest: '游客', head: '班主任', teacher: '任课教师', student: '学生' };

  /* 拦截层里说明「本人可看什么」的一句话 */
  var ROLE_SCOPE = {
    guest: '当前身份为<b>游客</b>，仅可浏览首页内容。',
    student: '当前身份为<b>学生</b>，仅可查看本人成长与自查数据。'
  };

  /* 班主任凭据（Base64 编码，静态站点无法真正加密，仅避免明文直读）
     可登录的班主任账号：
       · 马志豪 / qazWSX123  —— 班主任本人
       · admin  / 123456     —— 评委演示账号 */
  var HEAD_ACCOUNTS = [
    { u: '6ams5b+X6LGq', p: 'cWF6V1NYMTIz' },  /* 马志豪 */
    { u: 'YWRtaW4=', p: 'MTIzNDU2' }           /* admin / 123456 */
  ];

  /* 学生凭据：李世博 / 147369（同一学生，只能看本人的成长与自查数据） */
  var STU_USER = '5p2O5LiW5Y2a';
  var STU_PASS = 'MTQ3MzY5';
  var STU_SID = '2325502001';

  function dec(s) {
    try { return decodeURIComponent(escape(atob(s))); } catch (e) { return ''; }
  }

  /* ---------------- 会话 ---------------- */
  function session() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return (o && o.role) ? o : null;
    } catch (e) { return null; }
  }

  function setSession(role, name, sid) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        role: role, name: name || '', sid: sid || '', ts: Date.now()
      }));
    } catch (e) {}
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function roleLabel(role) { return ROLE_LABEL[role] || '访客'; }

  function isEnabled(role) { return ENABLED[role] === true; }

  /* ---------------- 登录校验 ---------------- */
  function login(role, user, pass) {
    if (!ENABLED[role]) return { ok: false, silent: true };
    if (role === 'guest') {
      setSession('guest', '');
      return { ok: true, role: 'guest' };
    }
    if (role === 'head' || role === 'student') {
      var u = String(user == null ? '' : user).trim();
      var p = String(pass == null ? '' : pass);
      if (!u && !p) return { ok: false, msg: '请输入账号与密码。' };
      if (!u) return { ok: false, msg: '请输入账号。' };
      if (!p) return { ok: false, msg: '请输入密码。' };

      if (role === 'head') {
        for (var i = 0; i < HEAD_ACCOUNTS.length; i++) {
          if (u === dec(HEAD_ACCOUNTS[i].u) && p === dec(HEAD_ACCOUNTS[i].p)) {
            setSession('head', u);
            return { ok: true, role: 'head', name: u, home: 'index.html' };
          }
        }
      }
      if (role === 'student' && u === dec(STU_USER) && p === dec(STU_PASS)) {
        setSession('student', u, STU_SID);
        return { ok: true, role: 'student', name: u, sid: STU_SID, home: 'student.html' };
      }
      return { ok: false, msg: '账号或密码不正确，请核对后重试。' };
    }
    return { ok: false, msg: '该身份暂未开放。' };
  }

  /* ---------------- 权限 ---------------- */
  function pageName() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function canView(page, s) {
    if (!s) return false;
    if (s.role === 'head') return true;
    var allow = ROLE_PAGES[s.role];
    return !!allow && allow.indexOf(page) >= 0;
  }

  /* 该角色登录后的落地页 */
  function homePage(role) {
    return ROLE_PAGES[role] ? ROLE_PAGES[role][0] : 'index.html';
  }

  /* 拦截层「次要按钮」的去向：回到该角色能看的页面 */
  function homeLabel(role) {
    return role === 'student' ? '返回自查页' : '返回首页';
  }

  function logoutTo() { location.replace(LOGIN_PAGE); }

  /* ---------------- 样式（自包含，避免依赖额外 css 文件） ---------------- */
  var CSS = [
    /* 门禁判定期间先藏住真实内容，避免任何闪动 */
    'html.qx-gate-pending body > *:not(#qxGate){visibility:hidden!important}',
    '#qxGate{visibility:visible!important}',

    /* ---- 「请登录」拦截层 ---- */
    '#qxGate{position:fixed;inset:0;z-index:99999;overflow:auto;display:flex;align-items:center;justify-content:center;padding:48px 20px;',
    'background:radial-gradient(120% 120% at 84% 6%,#C93A1E 0%,#A81F14 44%,#7C130D 100%);}',
    '#qxGate::after{content:"";position:fixed;left:-140px;top:-120px;width:520px;height:520px;border-radius:50%;pointer-events:none;',
    'background:conic-gradient(from 200deg,rgba(245,197,24,.24),transparent 55%);filter:blur(8px);}',
    '.qx-gate-card{position:relative;z-index:1;width:100%;max-width:560px;text-align:center;padding:44px 38px 34px;border-radius:28px;',
    'background:#FFF9EC;box-shadow:0 28px 70px rgba(0,0,0,.34);border:1px solid rgba(245,197,24,.55);}',
    '.qx-gate-badge{width:76px;height:76px;border-radius:50%;margin:0 auto 16px;border:3px solid #F5C518;box-shadow:0 8px 22px rgba(124,19,13,.28);}',
    '.qx-gate-tag{display:inline-block;font-size:12.5px;letter-spacing:.18em;font-weight:700;color:#A9740F;',
    'border:1px solid #F0CE7A;background:#FDF3D8;border-radius:999px;padding:5px 14px;margin-bottom:16px;}',
    '.qx-gate-card h1{font-size:34px;color:#8E1610;letter-spacing:.16em;margin:0 0 14px;}',
    '.qx-gate-lead{color:#6E5528;font-size:15px;line-height:1.9;margin:0 auto 26px;max-width:42ch;}',
    '.qx-gate-lead b{color:#C6281C;}',
    '.qx-gate-acts{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}',
    '.qx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:132px;height:46px;padding:0 22px;',
    'border-radius:999px;font-size:15.5px;font-weight:700;text-decoration:none;cursor:pointer;border:1px solid #E4CE9B;',
    'background:#fff;color:#8E1610;transition:transform .15s ease,box-shadow .2s ease;}',
    '.qx-btn:hover{text-decoration:none;transform:translateY(-1px);box-shadow:0 8px 20px rgba(58,37,16,.14);}',
    '.qx-btn-primary{border-color:transparent;background:linear-gradient(135deg,#E0391F,#C6281C);color:#fff;',
    'box-shadow:0 10px 24px rgba(198,40,28,.32);}',
    '.qx-gate-foot{margin:22px 0 0;font-size:12.5px;color:#9C8459;}',

    /* ---- 顶栏身份条 ---- */
    '.qx-who{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 6px 0 12px;border:1px solid #F0CE7A;',
    'background:#FDF3D8;border-radius:999px;font-size:13px;color:#6E5528;white-space:nowrap;flex:none;}',
    '.qx-who .r{font-weight:700;color:#A9740F;}',
    '.qx-who .n{font-weight:700;color:#3A2510;}',
    '.qx-who a{display:inline-flex;align-items:center;height:24px;padding:0 11px;border-radius:999px;background:#fff;',
    'color:#C6281C;font-weight:700;font-size:12.5px;}',
    '.qx-who a:hover{text-decoration:none;background:#FDECE7;}',

    /* ---- 「本人数据专属视图」标记（学生身份下替代身份切换控件） ---- */
    '.qx-self-tag{display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:999px;',
    'background:#FDF3D8;border:1px solid #F0CE7A;color:#A9740F;font-size:12.5px;font-weight:700;letter-spacing:.04em;}',
    '@media (max-width:900px){.qx-who{display:none}}',
    '@media (max-width:760px){.qx-gate-card{padding:34px 22px 28px}.qx-gate-card h1{font-size:27px}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('qxAuthCss')) return;
    var st = document.createElement('style');
    st.id = 'qxAuthCss';
    st.textContent = CSS;
    var host = document.head || document.documentElement;
    if (host) host.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---------------- 「请登录」拦截层 ---------------- */
  function lockPage(s, page) {
    var role = s && s.role;
    var isLogged = !!role && role !== 'guest';

    document.title = '请登录 · 24 机电一体化“七星班”';

    /* 已登录但不具备本页权限：说明是「权限不够」，不是「没登录」 */
    var scope = ROLE_SCOPE[role] || (isLogged ? '' : ROLE_SCOPE.guest);

    function render() {
      if (document.getElementById('qxGate')) return;
      var box = document.createElement('div');
      box.id = 'qxGate';
      box.innerHTML =
        '<div class="qx-gate-card">' +
          '<img class="qx-gate-badge" src="assets/img/badge.jpg" alt="七星班班徽">' +
          '<div class="qx-gate-tag">24 机电一体化“七星班” · 访问受限</div>' +
          '<h1>' + (isLogged ? '访问受限' : '请登录') + '</h1>' +
          '<p class="qx-gate-lead">' +
            (scope ? scope + '<br>' : '') +
            '本页属于班级内部资料，需使用<b>相应权限</b>的账号登录后查看。</p>' +
          '<div class="qx-gate-acts">' +
            (isLogged
              ? '<a class="qx-btn qx-btn-primary" href="' + homePage(role) + '">' + homeLabel(role) + '</a>' +
                '<a class="qx-btn" href="login.html">切换账号</a>'
              : '<a class="qx-btn qx-btn-primary" href="login.html">前往登录</a>' +
                '<a class="qx-btn" href="index.html">返回首页</a>') +
          '</div>' +
          '<p class="qx-gate-foot">如需查看班级内部资料，请联系班主任获取登录账号。</p>' +
        '</div>';
      document.body.appendChild(box);
      /* 保持 qx-gate-pending：正文始终 visibility:hidden，
         彻底避免被遮挡内容被误触、自动播放或被读屏读到。
         #qxGate 由 :not(#qxGate) 排除，照常可见。 */
    }

    onReady(render);
  }

  /* ---------------- 顶栏身份条 ---------------- */
  function mountWho(s) {
    var bar = document.querySelector('.site-header .bar');
    if (!bar || !s || document.getElementById('qxWho')) return;
    var box = document.createElement('div');
    box.id = 'qxWho';
    box.className = 'qx-who';
    /* 游客没有姓名，避免出现「游客 游客」 */
    var showName = s.name && s.name !== roleLabel(s.role);
    box.innerHTML = '<span class="r">' + esc(roleLabel(s.role)) + '</span>' +
      (showName ? '<span class="n">' + esc(s.name) + '</span>' : '') +
      '<a href="' + LOGIN_PAGE + '?logout=1">退出</a>';
    bar.appendChild(box);
  }

  /* ---------------- 页面守卫 ---------------- */
  function guard(page) {
    injectCSS();
    document.documentElement.classList.add('qx-gate-pending');

    var s = session();

    /* 未登录：先回登录页，正文一帧都不渲染 */
    if (!s) { location.replace(LOGIN_PAGE); return; }

    if (canView(page, s)) {
      document.documentElement.classList.remove('qx-gate-pending');
      onReady(function () { mountWho(s); });
    } else {
      lockPage(s, page);
    }
  }

  /* ---------------- 登录页辅助 ---------------- */
  function handleLogoutParam() {
    if (!/[?&]logout=1/.test(location.search)) return false;
    clear();
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    return true;
  }

  /* 带 data-guard 的 <script> 自动执行守卫 */
  var self = document.currentScript;
  if (self && self.hasAttribute('data-guard')) {
    guard(self.getAttribute('data-page') || pageName());
  }

  /* 学生身份下，页面只能呈现本人数据：返回 {name, sid}，其他角色返回 null */
  function me() {
    var s = session();
    return (s && s.role === 'student') ? { name: s.name, sid: s.sid || '' } : null;
  }

  return {
    session: session,
    setSession: setSession,
    clear: clear,
    login: login,
    logout: clear,
    isEnabled: isEnabled,
    roleLabel: roleLabel,
    canView: canView,
    pageName: pageName,
    homePage: homePage,
    homeLabel: homeLabel,
    me: me,
    handleLogoutParam: handleLogoutParam
  };
})();
