/* 围涂 · scene.js —— 章首的海涂动画 + 听风（风声、远处打桩）
 * 要在 reader.js 之前加载：往 READER_SCENES 里登记 heads.mudflat 和 sounds.wind。
 * 章首：夜里的海涂，地平线上一线门缝里漏出来的黄光；紧的章偏冷，“灯”的章亮着，插章是一页旧账。
 * cols = [潮色, 灯色, 墨色, 红笔]（由 theme.css 里的 --scene-1..4 给）。 */
(function () {
  "use strict";
  var SC = window.READER_SCENES = window.READER_SCENES || {};
  SC.heads = SC.heads || {};
  SC.sounds = SC.sounds || {};

  /* 当前章的情绪：读 book-data，章号从 #app[data-ch] 来（reader.js 在挂动画之前就写好了） */
  var chapters = null;
  function moodNow() {
    if (!chapters) {
      try { chapters = JSON.parse(document.getElementById("book-data").textContent).chapters || []; } catch (e) { chapters = []; }
    }
    var app = document.getElementById("app");
    var n = app ? parseInt(app.getAttribute("data-ch") || "0", 10) : 0;
    var c = chapters[n - 1];
    return c && c.mood ? c.mood : "jin";
  }

  function rgb(s) {
    s = String(s || "").trim();
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i.exec(s);
    return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
  // 每一帧都一样的“随机”：反光的碎片不乱跳
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  var cache = { key: "", C: null };
  function colors(cols) {
    var key = cols.join("|");
    if (cache.key !== key) {
      cache = { key: key, C: { tide: rgb(cols[0]), lamp: rgb(cols[1]), ink: rgb(cols[2]), red: rgb(cols[3]) } };
    }
    return cache.C;
  }

  SC.heads.mudflat = function (ctx, w, h, t, cols) {
    var C = colors(cols);
    var kind = moodNow();
    ctx.clearRect(0, 0, w, h);

    if (kind === "cha") {
      // 插章：一页旧账。横线，左边两道红竖线，右上角一点灯光
      var g = ctx.createRadialGradient(w * 0.82, h * 0.1, 0, w * 0.82, h * 0.1, Math.max(w, h) * 0.7);
      g.addColorStop(0, rgba(C.lamp, 0.16)); g.addColorStop(1, rgba(C.lamp, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      var step = 30;
      for (var y = step * 2; y < h; y += step) { ctx.fillStyle = rgba(C.ink, 0.06); ctx.fillRect(0, y, w, 1); }
      var mx = Math.max(24, Math.min(w * 0.1, 90));
      ctx.fillStyle = rgba(C.red, 0.34); ctx.fillRect(mx, 0, 1, h); ctx.fillRect(mx + 4, 0, 1, h);
      ctx.fillStyle = rgba(C.ink, 0.05); ctx.fillRect(w - mx, 0, 1, h);
      return;
    }

    var warm = kind === "deng";
    var hz = Math.round(h * 0.40);
    var flick = 0.86 + 0.08 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 4.7 + 1.1) + 0.03 * Math.sin(t * 11.3);

    // 天：地平线那里亮一点
    var sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, rgba(C.tide, 0));
    sky.addColorStop(1, warm ? rgba(C.lamp, 0.13) : rgba(C.tide, 0.26));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hz);

    // 光：门缝里漏出来的一线
    var cx = w * 0.64;
    var slit = Math.min(w * 0.34, 300) * (warm ? 1.25 : 1);
    var glowR = warm ? Math.max(w, h) * 0.85 : Math.max(w * 0.5, h * 0.55);
    var rg = ctx.createRadialGradient(cx, hz, 0, cx, hz, glowR);
    rg.addColorStop(0, rgba(C.lamp, (warm ? 0.34 : 0.15) * flick));
    rg.addColorStop(0.35, rgba(C.lamp, (warm ? 0.12 : 0.04) * flick));
    rg.addColorStop(1, rgba(C.lamp, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);

    // 远处的海：地平线一整道，很淡
    ctx.fillStyle = rgba(warm ? C.lamp : C.tide, warm ? 0.22 : 0.55);
    ctx.fillRect(0, hz, w, 1);
    var lg = ctx.createLinearGradient(cx - slit / 2, 0, cx + slit / 2, 0);
    lg.addColorStop(0, rgba(C.lamp, 0));
    lg.addColorStop(0.2, rgba(C.lamp, 0.95 * flick));
    lg.addColorStop(0.8, rgba(C.lamp, 0.95 * flick));
    lg.addColorStop(1, rgba(C.lamp, 0));
    ctx.fillStyle = lg; ctx.fillRect(cx - slit / 2, hz - 1, slit, 2);

    // 海涂：地平线到最外面那道塘之间，一道道潮印，慢慢往岸上爬
    var outer = hz + (h - hz) * 0.2;
    var marks = 7;
    for (var k = 0; k < marks; k++) {
      var f = (k + 1) / (marks + 1);
      var y0 = hz + (outer - hz) * f * f + 1;
      var drift = t * (0.12 + k * 0.02);
      ctx.beginPath();
      for (var x = 0; x <= w + 6; x += 6) {
        var yy = y0 + Math.sin(x / (26 + f * 60) + drift + k * 1.7) * (0.6 + f * 1.6)
                    + Math.sin(x / (9 + f * 14) - drift * 1.6) * (0.3 + f * 0.5);
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = rgba(warm ? C.lamp : C.tide, (warm ? 0.14 : 0.32) + f * 0.22);
      ctx.lineWidth = 0.6 + f * 0.6;
      ctx.stroke();
    }

    // 湿泥上的倒影：光底下碎成一截一截
    var rows = 16;
    for (var i = 0; i < rows; i++) {
      var fy = (i + 1) / rows;
      var ry = hz + 3 + (outer - hz + (h - outer) * 0.35) * fy * fy;
      var shimmer = 0.5 + 0.5 * Math.sin(t * (1.6 + hash(i) * 1.4) + i * 2.1);
      var rw = slit * (0.55 - fy * 0.35) * (0.5 + hash(i + 9) * 0.7);
      var ox = (hash(i + 3) - 0.5) * slit * 0.25 + Math.sin(t * 0.7 + i) * 3;
      ctx.fillStyle = rgba(C.lamp, (warm ? 0.5 : 0.36) * (1 - fy * 0.8) * (0.35 + 0.65 * shimmer) * flick);
      ctx.fillRect(cx - rw / 2 + ox, ry, rw, fy < 0.3 ? 1 : 1.5);
    }

    // 塘：近处一道道直的，越近越粗
    var walls = [0.2, 0.42, 0.62];
    for (var j = 0; j < walls.length; j++) {
      var wf = walls[j];
      var wy = hz + (h - hz) * wf * wf + (j === 0 ? 0 : 4);
      if (wy > h * 0.58) break;
      var th = 1 + j * 0.8;
      ctx.fillStyle = rgba(C.ink, 0.07 + j * 0.03);
      ctx.fillRect(0, wy, w, th);
      ctx.fillStyle = rgba(C.lamp, (warm ? 0.12 : 0.05) * flick);
      ctx.fillRect(cx - slit * (0.4 + j * 0.25), wy, slit * (0.8 + j * 0.5), 1);
    }
  };

  /* ---------- 听风：海塘上的风，远处有人打桩（点了才响） ---------- */
  var live = null;   // 开着的时候：{ ac, bus, click, api }

  function thump(L, when, vol) {
    var ac = L.ac;
    // 一下闷响：很低的一声“咚”，前面带一点铁碰铁
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(78, when);
    o.frequency.exponentialRampToValueAtTime(36, when + 0.28);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
    o.connect(g); g.connect(L.bus); o.start(when); o.stop(when + 0.75);
    var n = ac.createBufferSource(); n.buffer = L.click;
    var bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 1.2;
    var ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.exponentialRampToValueAtTime(vol * 0.5, when + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    n.connect(bp); bp.connect(ng); ng.connect(L.bus); n.start(when); n.stop(when + 0.12);
  }

  SC.sounds.wind = function (ac, out, api) {
    var srcs = [];
    function lfo(freq, depth, target) {
      var o = ac.createOscillator(); o.frequency.value = freq;
      var g = ac.createGain(); g.gain.value = depth;
      o.connect(g); g.connect(target); o.start(); srcs.push(o);
    }
    var click = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.15), ac.sampleRate);
    var cd = click.getChannelData(0);
    for (var i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * 0.5;

    // 风：中频一层，一阵一阵
    var s1 = ac.createBufferSource(); s1.buffer = api.noise(6); s1.loop = true;
    var bp1 = ac.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 520; bp1.Q.value = 0.8;
    var g1 = ac.createGain(); g1.gain.value = 0.5;
    s1.connect(bp1); bp1.connect(g1); g1.connect(out);
    lfo(0.06, 260, bp1.frequency); lfo(0.09, 0.32, g1.gain);
    // 风掠过塘顶：细一点、高一点的哨音
    var s2 = ac.createBufferSource(); s2.buffer = api.noise(5); s2.loop = true;
    var bp2 = ac.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 1350; bp2.Q.value = 3.5;
    var g2 = ac.createGain(); g2.gain.value = 0.07;
    s2.connect(bp2); bp2.connect(g2); g2.connect(out);
    lfo(0.13, 380, bp2.frequency); lfo(0.05, 0.06, g2.gain);
    // 底下的闷声：远处的海
    var s3 = ac.createBufferSource(); s3.buffer = api.noise(7); s3.loop = true;
    var lp3 = ac.createBiquadFilter(); lp3.type = "lowpass"; lp3.frequency.value = 170;
    var g3 = ac.createGain(); g3.gain.value = 0.55;
    s3.connect(lp3); lp3.connect(g3); g3.connect(out);
    lfo(0.04, 0.2, g3.gain);
    // 打桩：隔得远，只剩低的
    var bus = ac.createBiquadFilter(); bus.type = "lowpass"; bus.frequency.value = 420;
    var pg = ac.createGain(); pg.gain.value = 0.5;
    bus.connect(pg); pg.connect(out);
    s1.start(); s2.start(); s3.start();
    srcs.push(s1, s2, s3);

    var L = live = { ac: ac, bus: bus, click: click, api: api };
    function burst() {
      if (!api.on()) return;
      var n = 5 + Math.floor(Math.random() * 5), gap = 1.35 + Math.random() * 0.25, t0 = ac.currentTime + 0.1;
      for (var k = 0; k < n; k++) thump(L, t0 + k * gap, 0.55 + Math.random() * 0.15);
      api.later(burst, n * gap * 1000 + 26000 + Math.random() * 32000);
    }
    api.later(burst, 9000 + Math.random() * 7000);
    return srcs;
  };

  /* 第二十章最后一段：远处三声。风声开着才响 */
  window.WT_KNOCK = function (n) {
    var L = live;
    if (!L || !L.api.on()) return;
    var t0 = L.ac.currentTime + 0.15;
    for (var i = 0; i < n; i++) thump(L, t0 + i * 1.4, 0.75);
  };
})();
