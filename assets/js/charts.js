/* ============================================================
   七星班班级网站 · 轻量 SVG 图表组件
   零依赖、纯手写。对外暴露 window.QXChart
   ============================================================ */
(function () {
  'use strict';

  var FONT = 'Microsoft YaHei, PingFang SC, Hiragino Sans GB, sans-serif';
  var uid = 0;
  function nextId(p) { uid += 1; return p + uid; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function svgOpen(w, h, extra) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" ' +
      'xmlns="http://www.w3.org/2000/svg" font-family="' + FONT + '" ' +
      (extra || '') + '>';
  }

  function mount(el, markup) {
    if (!el) return;
    el.innerHTML = markup;
  }

  /* ---------------- 雷达图 ---------------- */
  /**
   * radar(el, { axes:[{key,label}], series:[{name,color,values:[]}], max })
   */
  function radar(el, opt) {
    var axes = opt.axes || [];
    var series = opt.series || [];
    var max = opt.max || 100;
    var W = 360, H = 320, cx = 180, cy = 152, R = 106;
    var n = axes.length || 1;

    function pt(i, ratio) {
      var a = (-Math.PI / 2) + i * (2 * Math.PI / n);
      return [cx + Math.cos(a) * R * ratio, cy + Math.sin(a) * R * ratio];
    }
    function poly(ratio) {
      var s = [];
      for (var i = 0; i < n; i++) { var p = pt(i, ratio); s.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); }
      return s.join(' ');
    }

    var g = '';
    // 网格
    [0.25, 0.5, 0.75, 1].forEach(function (r) {
      g += '<polygon points="' + poly(r) + '" fill="none" stroke="#F2E3C2" stroke-width="1"/>';
    });
    // 轴线 + 轴标签
    for (var i = 0; i < n; i++) {
      var e = pt(i, 1);
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) +
        '" stroke="#F2E3C2" stroke-width="1"/>';
      var l = pt(i, 1.24);
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      g += '<text x="' + l[0].toFixed(1) + '" y="' + (l[1] + 4).toFixed(1) + '" text-anchor="' + anchor +
        '" font-size="12" fill="#6E5528">' + esc(axes[i].label) + '</text>';
    }
    // 数据层
    series.forEach(function (s) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var v = Math.max(0, Math.min(max, s.values[i] || 0));
        var p = pt(i, v / max);
        pts.push(p);
      }
      var coords = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
      g += '<polygon points="' + coords + '" fill="' + s.color + '" fill-opacity="0.16" stroke="' + s.color +
        '" stroke-width="2.2" stroke-linejoin="round"/>';
      pts.forEach(function (p, i) {
        g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.4" fill="#fff" stroke="' +
          s.color + '" stroke-width="2"><title>' + esc(axes[i].label + '：' + s.values[i]) + '</title></circle>';
      });
    });

    mount(el, svgOpen(W, H) + g + '</svg>');
  }

  /* ---------------- 折线 / 面积图 ---------------- */
  /**
   * line(el, { labels:[], series:[{name,color,values:[]}], min, max, unit })
   */
  function line(el, opt) {
    var labels = opt.labels || [];
    var series = opt.series || [];
    var W = 560, H = 280, PL = 44, PR = 18, PT = 22, PB = 44;
    var iw = W - PL - PR, ih = H - PT - PB;
    var n = labels.length;
    var all = [];
    series.forEach(function (s) { all = all.concat(s.values); });
    var max = opt.max != null ? opt.max : Math.ceil((Math.max.apply(null, all) + 3) / 10) * 10;
    var min = opt.min != null ? opt.min : Math.max(0, Math.floor((Math.min.apply(null, all) - 6) / 10) * 10);
    if (max === min) max = min + 10;

    function X(i) { return PL + (n <= 1 ? iw / 2 : i * iw / (n - 1)); }
    function Y(v) { return PT + ih - (Math.max(min, Math.min(max, v)) - min) / (max - min) * ih; }

    var g = '';
    // Y 网格
    for (var t = 0; t <= 4; t++) {
      var v = min + (max - min) * t / 4;
      var y = Y(v);
      g += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PR) + '" y2="' + y.toFixed(1) +
        '" stroke="#F5E9CE" stroke-width="1"/>';
      g += '<text x="' + (PL - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9C8459">' +
        Math.round(v) + '</text>';
    }
    // X 标签
    labels.forEach(function (lb, i) {
      g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - PB + 22) + '" text-anchor="middle" font-size="11.5" fill="#6E5528">' +
        esc(lb) + '</text>';
    });

    series.forEach(function (s, si) {
      var pts = s.values.map(function (v, i) { return [X(i), Y(v)]; });
      var d = smooth(pts);
      var gid = nextId('cxg');
      g += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + s.color + '" stop-opacity="0.26"/>' +
        '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/>' +
        '</linearGradient></defs>';
      g += '<path d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (PT + ih) +
        ' L' + pts[0][0].toFixed(1) + ' ' + (PT + ih) + ' Z" fill="url(#' + gid + ')"/>';
      g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
      pts.forEach(function (p, i) {
        g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="#fff" stroke="' +
          s.color + '" stroke-width="2.2"><title>' + esc(labels[i] + '　' + s.name + '：' + s.values[i]) + '</title></circle>';
      });
    });

    mount(el, svgOpen(W, H) + g + '</svg>');
  }

  // Catmull-Rom → 三次贝塞尔，得到平滑曲线
  function smooth(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return 'M' + pts[0][0] + ' ' + pts[0][1];
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) +
        ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  /* ---------------- 分组柱状图 ---------------- */
  /**
   * groupedBars(el, { categories:[], series:[{name,color,values:[]}], max })
   */
  function groupedBars(el, opt) {
    var cats = opt.categories || [];
    var series = opt.series || [];
    var max = opt.max || 100;
    var W = 620, H = 300, PL = 44, PR = 16, PT = 20, PB = 62;
    var iw = W - PL - PR, ih = H - PT - PB;
    var gw = iw / (cats.length || 1);
    var bw = Math.max(6, (gw * 0.68) / (series.length || 1));

    var g = '';
    for (var t = 0; t <= 4; t++) {
      var v = max * t / 4, y = PT + ih - (v / max) * ih;
      g += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PR) + '" y2="' + y.toFixed(1) +
        '" stroke="#F5E9CE" stroke-width="1"/>';
      g += '<text x="' + (PL - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="#9C8459">' +
        Math.round(v) + '</text>';
    }
    cats.forEach(function (c, i) {
      var x0 = PL + i * gw + (gw - bw * series.length) / 2;
      series.forEach(function (s, si) {
        var val = s.values[i] || 0;
        var h = Math.max(2, (val / max) * ih);
        var x = x0 + si * bw;
        g += '<rect x="' + x.toFixed(1) + '" y="' + (PT + ih - h).toFixed(1) + '" width="' + (bw - 3).toFixed(1) +
          '" height="' + h.toFixed(1) + '" rx="3" fill="' + s.color + '"><title>' +
          esc(c + '　' + s.name + '：' + val) + '</title></rect>';
      });
      g += '<text x="' + (PL + i * gw + gw / 2).toFixed(1) + '" y="' + (H - PB + 20) +
        '" text-anchor="middle" font-size="12" fill="#6E5528">' + esc(c) + '</text>';
    });

    mount(el, svgOpen(W, H) + g + '</svg>');
  }

  /* ---------------- 进度环 ---------------- */
  /**
   * donut(el, { value, max, label, sub, color, size })
   */
  function donut(el, opt) {
    var value = opt.value || 0;
    var max = opt.max || 100;
    var size = opt.size || 132;
    var sw = opt.stroke || 11;
    var r = (size - sw) / 2;
    var c = 2 * Math.PI * r;
    var ratio = Math.max(0, Math.min(1, value / max));
    var color = opt.color || '#C6281C';
    var cx = size / 2;

    var g = '';
    g += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="#F5E9CE" stroke-width="' + sw + '"/>';
    g += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color +
      '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) +
      '" stroke-dashoffset="' + (c * (1 - ratio)).toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>';
    g += '<text x="' + cx + '" y="' + (cx + 2) + '" text-anchor="middle" font-size="' + (size * 0.24).toFixed(0) +
      '" font-weight="800" fill="#3A2510">' + esc(opt.label != null ? opt.label : value) + '</text>';
    if (opt.sub) {
      g += '<text x="' + cx + '" y="' + (cx + size * 0.17) + '" text-anchor="middle" font-size="11.5" fill="#9C8459">' +
        esc(opt.sub) + '</text>';
    }
    mount(el, svgOpen(size, size) + g + '</svg>');
  }

  /* ---------------- 迷你趋势线（无坐标轴） ---------------- */
  function spark(el, values, color) {
    var W = 160, H = 42, P = 4;
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    if (max === min) { max += 1; min -= 1; }
    var pts = values.map(function (v, i) {
      return [P + i * (W - 2 * P) / (values.length - 1), H - P - (v - min) / (max - min) * (H - 2 * P)];
    });
    var d = smooth(pts);
    var g = '<path d="' + d + '" fill="none" stroke="' + (color || '#C6281C') +
      '" stroke-width="2" stroke-linecap="round"/>';
    mount(el, svgOpen(W, H) + g + '</svg>');
  }

  window.QXChart = { radar: radar, line: line, groupedBars: groupedBars, donut: donut, spark: spark };
})();
