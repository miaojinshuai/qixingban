/* ============================================================
   七星班班级网站 · 公共脚本
   站点导航、入场动效、数据访问器、本地存储
   零依赖。
   ============================================================ */
window.QXUI = (function () {
  'use strict';

  var D = window.QX || {};

  /* ---------------- 基础工具 ---------------- */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function avg(a) { return a.length ? sum(a) / a.length : 0; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---------------- 站点导航 ---------------- */
  var NAV = [
    { href: 'index.html',     text: '首页' },
    { href: 'plan.html',      text: '建设方案' },
    { href: 'groups.html',    text: '七星组榜' },
    { href: 'growth.html',    text: '成长进步' },
    { href: 'honor.html',     text: '荣誉空间' },
    { href: 'activities.html', text: '活动风采' },
    { href: 'teacher.html',   text: '教师管理' },
    { href: 'student.html',   text: '学生自查' }
  ];

  function currentPage() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function initNav() {
    var cur = currentPage();
    qsa('.nav a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === cur) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var btn = qs('.nav-toggle');
    var nav = qs('.nav');
    if (btn && nav) {
      btn.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      qsa('.nav a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('open'); });
      });
    }
  }

  /* ---------------- 顶部导航 / 页脚（供未内联的页面使用） ---------------- */
  function navHTML() {
    var cur = currentPage();
    return NAV.map(function (n) {
      var cur2 = n.href === cur ? ' aria-current="page"' : '';
      return '<a href="' + n.href + '"' + cur2 + '>' + n.text + '</a>';
    }).join('');
  }

  /* ---------------- 入场动效 ---------------- */
  function initReveal() {
    var items = qsa('.reveal');
    if (!items.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ---------------- 本地存储 ---------------- */
  var KEY = 'qx-class-site-v1';
  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* 隐私模式忽略 */ }
  }
  var store = {
    get: function (k, dft) { var s = readStore(); return s[k] === undefined ? dft : s[k]; },
    set: function (k, v) { var s = readStore(); s[k] = v; writeStore(s); },
    all: readStore
  };

  /* ---------------- 数据访问器 ---------------- */
  var students = D.students || [];
  var groups = D.groups || [];
  var dims = D.dims || [];

  var byId = {};
  students.forEach(function (s) { byId[s.id] = s; });
  var byName = {};
  students.forEach(function (s) { (byName[s.name] = byName[s.name] || []).push(s); });

  function student(id) { return byId[id]; }
  function studentsOf(groupId) { return students.filter(function (s) { return s.group === groupId; }); }
  function groupOf(groupId) {
    for (var i = 0; i < groups.length; i++) if (groups[i].id === groupId) return groups[i];
    return null;
  }
  function boardOf(groupId) {
    var b = D.board || [];
    for (var i = 0; i < b.length; i++) if (b[i].id === groupId) return b[i];
    return null;
  }

  /** 某学生某学期的七维均值（不含学业成绩，仅成长表现分） */
  function termAvg(s, t) {
    if (!s || !s.terms || !s.terms[t]) return 0;
    var row = s.terms[t];
    return r1(avg(dims.map(function (d) { return row[d.key] || 0; })));
  }

  /** 某学生某维度的六学期序列 */
  function dimSeries(s, key) {
    return (s.terms || []).map(function (row) { return row[key] || 0; });
  }

  /** 该学生相对全班均值的强弱项（用于自查页，仅呈现本人，不做同学间排名） */
  function strengths(s, count) {
    count = count || 3;
    var last = s.terms[s.terms.length - 1];
    var arr = dims.map(function (d) {
      return { key: d.key, name: d.name, star: d.star, value: last[d.key] || 0, gain: (last[d.key] || 0) - (s.terms[0][d.key] || 0) };
    });
    var byValue = arr.slice().sort(function (a, b) { return b.value - a.value; });
    return {
      top: byValue.slice(0, count),
      low: byValue.slice(-2).reverse(),
      byGain: arr.slice().sort(function (a, b) { return b.gain - a.gain; })
    };
  }

  /** 七星组配色 */
  var GROUP_COLOR = {
    tz: '#C6281C', tx: '#E0A020', tj: '#E8721C',
    tq: '#C6281C', yh: '#A9740F', ky: '#E0A020', yg: '#C93A1E'
  };
  function groupColor(id) { return GROUP_COLOR[id] || '#C6281C'; }

  /** 荣誉级别配色 */
  function levelChip(level) {
    if (level === '省级') return 'chip-red';
    if (level === '市级') return 'chip-gold';
    return 'chip-info';
  }

  /* ---------------- 渲染小件 ---------------- */
  function barRow(name, value, max) {
    max = max || 100;
    var pct = Math.max(0, Math.min(100, value / max * 100));
    return '<div class="bar-row"><span class="n">' + esc(name) + '</span>' +
      '<span class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
      '<span class="v num">' + value + '</span></div>';
  }

  function chip(text, cls) {
    return '<span class="chip ' + (cls || '') + '">' + esc(text) + '</span>';
  }

  function empty(text) {
    return '<div class="empty"><div class="big">✦</div><p class="mb0">' + esc(text || '暂无数据') + '</p></div>';
  }

  function init() {
    initNav();
    initReveal();
  }

  return {
    data: D,
    nav: NAV,
    navHTML: navHTML,
    qs: qs, qsa: qsa, esc: esc, sum: sum, avg: avg, r1: r1, onReady: onReady,
    store: store,
    students: students, groups: groups, dims: dims,
    student: student, byName: byName, studentsOf: studentsOf,
    groupOf: groupOf, boardOf: boardOf,
    termAvg: termAvg, dimSeries: dimSeries, strengths: strengths,
    groupColor: groupColor, levelChip: levelChip,
    barRow: barRow, chip: chip, empty: empty,
    init: init
  };
})();

QXUI.onReady(QXUI.init);
