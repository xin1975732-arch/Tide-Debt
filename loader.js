/* 《围涂》分章加载 loader.js
 * 正文放在 chapters/ch01.md … ch20.md，可以直接在 GitHub 上改字。
 * 网页打开时读取这些文件、排好版，再启动 reader.js、wt.js、features.js。
 * 写法：第一行 “## 第一章　章名”；一行一段（段间空一行也行）；单独一行 --- 是分节。
 * 群聊、手机、账页、手写等特殊排版，按“整段原文”对应 data/book.json 里的 rules；
 * 改了这类段落的字，要把 rules 里同样的那句也改成一样，否则它会按普通段落排。
 */
(function () {
  "use strict";
  var box = document.getElementById("book-data");
  var D = JSON.parse(box.textContent);
  var S = D.src;
  delete D.src;
  var MIC = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="4" y="1" width="4" height="6.5" rx="2" fill="currentColor"/><path d="M2.5 6a3.5 3.5 0 0 0 7 0M6 9.5V11" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>';
  var DOC_KINDS = { gaozhi: 1, fly: 1, slip: 1, ledger: 1, crop: 1, contract: 1, note: 1, notebig: 1, medical: 1, "entry-red": 1, "entry-pencil": 1, fn: 1, fnslow: 1, sign: 1, signbig: 1 };
  var GROUPABLE = { slip: 1, ledger: 1, contract: 1, medical: 1 };
  var NUMS = "零一二三四五六七八九";

  function cn(n) {
    if (n < 10) return NUMS[n];
    if (n < 20) return "十" + (n % 10 ? NUMS[n % 10] : "");
    return NUMS[Math.floor(n / 10)] + "十" + (n % 10 ? NUMS[n % 10] : "");
  }
  function E(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function unq(s) { s = s.trim(); return s.charAt(0) === "“" && s.charAt(s.length - 1) === "”" ? s.slice(1, -1) : s; }
  function len(s) { return Array.from(s).length; }
  function count(s) { return len(s.replace(/\s/g, "")); }
  function own(o, k) { return o && Object.prototype.hasOwnProperty.call(o, k); }

  var markRe = null, markId = {};
  function setMarks(people) {
    var ms = [];
    (people || []).forEach(function (p) { (p.mark || [p.name]).forEach(function (m) { ms.push([m, p.id]); }); });
    ms.sort(function (a, b) { return b[0].length - a[0].length; });
    markRe = ms.length ? new RegExp(ms.map(function (m) { return m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|"), "g") : null;
    markId = {};
    ms.forEach(function (m) { markId[m[0]] = m[1]; });
  }

  function Ctx() { this.paras = []; this.used = {}; }
  Ctx.prototype.add = function (t) { this.paras.push(t); return this.paras.length - 1; };
  Ctx.prototype.mark = function (text) {
    if (!markRe) return E(text);
    var out = [], pos = 0, m;
    markRe.lastIndex = 0;
    while ((m = markRe.exec(text))) {
      var pid = markId[m[0]];
      if (this.used[pid]) continue;
      this.used[pid] = 1;
      out.push(E(text.slice(pos, m.index)), '<b class="rn" data-c="' + pid + '">' + E(m[0]) + "</b>");
      pos = m.index + m[0].length;
    }
    out.push(E(text.slice(pos)));
    return out.join("");
  };
  Ctx.prototype.p = function (inner, text, cls, extra) {
    var i = this.add(text);
    return "<p" + (cls ? ' class="' + cls + '"' : "") + ' data-p="' + i + '"' + (extra || "") + ">" + inner + "</p>";
  };
  function split2(t, sep) { var i = t.indexOf(sep); return i < 0 ? null : [t.slice(0, i), t.slice(i + sep.length)]; }

  function renderChat(cx, items, kind, showHead) {
    var head;
    if (kind === "dm") head = '<div class="chat-h"><span>私信</span></div>';
    else {
      var t = "";
      for (var a = 0; a < items.length; a++) if (items[a][2].time) { t = '<span class="t">' + items[a][2].time + "</span>"; break; }
      head = showHead ? '<div class="chat-h"><span>' + E(S.group) + "</span>" + t + "</div>" : "";
    }
    var out = ['<div class="chat" role="group" aria-label="' + (kind === "dm" ? "私信" : "群聊消息") + '">' + head];
    items.forEach(function (it) {
      var k = it[0], text = it[1], o = it[2];
      if (k === "sys") { out.push(cx.p("<span>" + E(o.text) + "</span>", o.text, "sysm")); return; }
      var who = o.who;
      var av = who ? '<span class="av" aria-hidden="true">' + E(who !== "钟家孙子" ? who.slice(-1) : "钟") + "</span>" : '<span class="av anon" aria-hidden="true"></span>';
      var meta = [];
      if (who) meta.push("<span>" + E(who) + "</span>");
      if (o.voice) meta.push('<span class="vt">' + MIC + "语音转文字</span>");
      if (o.shot) meta.push("<span>旧截图 · 已撤回</span>");
      var metaHtml = meta.length ? '<p class="wwho">' + meta.join("") + "</p>" : "";
      var body = unq(text), q = o.quote;
      var inner = (q ? '<span class="wq">' + E(q) + "</span>" : "") + E(body);
      out.push('<div class="' + (o.shot ? "msg shot" : "msg") + '">' + av + "<div>" + metaHtml + cx.p(inner, (q || "") + body, "wbub") + "</div></div>");
    });
    out.push("</div>");
    return out.join("");
  }

  function renderDoc(cx, kind, items) {
    var texts = items.map(function (x) { return x[1]; });
    var T0 = texts[0], ps, sp;
    switch (kind) {
      case "gaozhi":
        var row1 = (len(T0) <= 9 ? [""] : []).concat(Array.from(T0)).slice(0, 10);
        while (row1.length < 10) row1.push("");
        var row2 = ["", "", "一", "、", "", "", "", "", "", ""], row3 = ["", "", "", "", "", "", "", "", "", ""];
        var rows = [row1, row2, row3].map(function (r) { return '<div class="gz-row">' + r.map(function (c) { return "<span>" + E(c) + "</span>"; }).join("") + "</div>"; }).join("");
        var i = cx.add(row1.concat(row2, row3).join(""));
        return '<figure class="doc gaozhi" data-p="' + i + '" role="img" aria-label="稿纸：' + E(T0) + '，下面一行只有“一、”">' + rows + "</figure>";
      case "fly": return '<div class="doc fly">' + cx.p(E(T0), T0) + "</div>";
      case "slip":
        return '<div class="doc slip">' + items.map(function (x) { return cx.p(E(x[1]), x[1], x[2].r ? "r" : ""); }).join("") + "</div>";
      case "ledger":
        return '<div class="doc ledger">' + items.map(function (x) {
          var t = x[1];
          if (x[2].head) return cx.p(E(t), t, "lh");
          sp = split2(t, "，");
          return sp ? cx.p("<span>" + E(sp[0]) + "，</span><span>" + E(sp[1]) + "</span>", t, "li") : cx.p(E(t), t);
        }).join("") + "</div>";
      case "crop": return '<div class="doc ledger crop">' + cx.p(E(T0), T0) + "</div>";
      case "contract":
        return '<div class="doc contract">' + texts.map(function (t) {
          var s = split2(t, "：");
          return s ? cx.p("<b>" + E(s[0]) + "：</b>" + E(s[1]), t) : cx.p(E(t), t);
        }).join("") + "</div>";
      case "note": return '<div class="doc note">' + texts.map(function (t) { return cx.p(E(t), t); }).join("") + '<div class="blank"></div></div>';
      case "notebig": return '<div class="doc note big">' + cx.p(E(T0), T0) + '<div class="blank"></div><div class="blank"></div></div>';
      case "medical":
        return '<div class="doc medical">' + items.map(function (x) {
          var t = x[1], s = x[2].scratch;
          if (s && t.indexOf(s) >= 0) { var k = t.indexOf(s); return cx.p(E(t.slice(0, k)) + '<span class="scratch-t">' + E(s) + "</span>" + E(t.slice(k + s.length)), t); }
          return cx.p(E(t), t);
        }).join("") + "</div>";
      case "entry-red": return '<div class="doc entry red">' + cx.p(E(T0), T0) + "</div>";
      case "entry-pencil": return '<div class="doc entry pencil">' + cx.p(E(T0), T0) + "</div>";
      case "fn": case "fnslow":
        sp = split2(T0, "：");
        if (!sp) return cx.p(E(T0), T0);
        return cx.p("<b>" + E(sp[0]) + "：</b>" + E(sp[1]), T0, kind === "fnslow" ? "fn slow" : "fn");
      case "sign": return '<div class="doc sign">' + cx.p(E(T0), T0) + "</div>";
      case "signbig": return '<div class="doc sign big">' + cx.p(E(T0), T0) + "</div>";
    }
    return cx.p(E(T0), T0);
  }

  function classify(n, t) {
    var sp = S.rules.special[n];
    if (own(sp, t)) return sp[t];
    var pf = S.rules.prefix[n];
    if (pf) for (var k in pf) if (own(pf, k) && t.indexOf(k) === 0) return pf[k];
    return null;
  }

  function paraHtml(cx, n, text, cls) {
    var body = null;
    (S.rules.inline[n] || []).forEach(function (r) {
      if (text.length >= r[0].length && text.slice(text.length - r[0].length) === r[0]) {
        body = cx.mark(text.slice(0, text.length - r[1].length)) + '<span class="' + r[2] + '">' + E(r[1]) + "</span>";
      }
    });
    if (body === null) body = cx.mark(text);
    var fx = own(S.rules.fx[n], text) ? ' data-fx="' + S.rules.fx[n][text] + '"' : "";
    return cx.p(body, text, cls, fx);
  }

  function renderChapter(n, lines) {
    var cx = new Ctx(), items = [], used = {}, out = [];
    lines.forEach(function (t) {
      if (t === "---") { items.push(["brk", t, {}]); return; }
      var c = classify(n, t);
      if (c) { items.push([c[0], t, c[1] || {}]); used[t] = 1; } else items.push(["p", t, {}]);
    });
    var lastIdx = -1;
    items.forEach(function (it, k) { if (it[0] !== "brk") lastIdx = k; });
    var i = 0, lastChatEnd = -99;
    while (i < items.length) {
      var kind = items[i][0], t = items[i][1], o = items[i][2], grp;
      if (kind === "brk") { out.push('<div class="brk" aria-hidden="true"><i></i><i></i><i></i></div>'); i++; continue; }
      if (kind === "chat" || kind === "sys" || kind === "dm") {
        var fam = kind === "dm" ? "dm" : "chat";
        grp = [];
        if (kind === "sys" && o.pre) out.push(cx.p(cx.mark(o.pre), o.pre));
        while (i < items.length && (fam === "dm" ? items[i][0] === "dm" : (items[i][0] === "chat" || items[i][0] === "sys"))) {
          if (items[i][0] === "sys" && grp.length) break;
          grp.push(items[i]); i++;
        }
        out.push(renderChat(cx, grp, fam, (i - grp.length) - lastChatEnd > 3));
        lastChatEnd = i;
        continue;
      }
      if (kind === "lock") {
        var hid = cx.add(t), who = o.who || "";
        out.push('<div class="lock" data-fx="lock" role="group" aria-label="锁屏通知，' + E(who) + '"><div class="lock-h"><span class="av" aria-hidden="true">' + E(who.slice(-1)) + "</span><b>" + E(who) + '</b><span class="t">' + (o.time || "") + '</span></div><p data-p="' + hid + '">' + E(t) + "</p></div>");
        i++; continue;
      }
      if (own(DOC_KINDS, kind)) {
        grp = [items[i]]; i++;
        if (own(GROUPABLE, kind)) while (i < items.length && items[i][0] === kind) { grp.push(items[i]); i++; }
        out.push(renderDoc(cx, kind, grp));
        continue;
      }
      if (kind === "beat" || kind === "beatred" || kind === "num") {
        out.push(paraHtml(cx, n, t, { beat: "beat", beatred: "beat red", num: "num" }[kind]));
        i++; continue;
      }
      if (n === S.count && i === lastIdx) {
        var idx = cx.add(t);
        out.push('<p class="ending" data-p="' + idx + '" data-fx="ending">' + cx.mark(t) + '</p><div class="thud" aria-hidden="true"><i></i><i></i><i></i></div>');
      } else out.push(paraHtml(cx, n, t, i === lastIdx ? "last" : ""));
      if (own(S.rules.after[n], t)) { out.push(S.rules.after[n][t]); used[t] = 1; }
      i++;
    }
    // 核对：写了规则却没在正文里找到的，提醒一下（不影响阅读）
    var miss = [];
    Object.keys(S.rules.special[n] || {}).forEach(function (k) { if (!used[k]) miss.push(k); });
    Object.keys(S.rules.prefix[n] || {}).forEach(function (k) { if (!lines.some(function (x) { return x.indexOf(k) === 0; })) miss.push(k); });
    (S.rules.inline[n] || []).forEach(function (r) { if (!lines.some(function (x) { return x.slice(-r[0].length) === r[0]; })) miss.push(r[0]); });
    if (miss.length && window.console) console.warn("第" + n + "章：data/book.json 里这些句子在正文里没找到（正文改过字？）：", miss);
    return { html: out.join("\n"), paras: cx.paras };
  }

  function parse(md) {
    var ls = md.replace(/\r\n?/g, "\n").replace(/^﻿/, "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    var head = "";
    if (ls.length && /^##\s/.test(ls[0])) head = ls.shift().replace(/^##\s*/, "").trim();
    var m = /^第(.+?)章[\s　]*(.+)$/.exec(head);
    return { title: m ? m[2].trim() : head, lines: ls };
  }

  function build(n, md) {
    var c = parse(md), meta = S.meta[String(n)] || {};
    var chars = 0;
    c.lines.forEach(function (x) { if (x !== "---") chars += count(x); });
    var r = renderChapter(n, c.lines), era = "", title = c.title;
    if (meta.mood === "cha") { era = "插章"; if (title.indexOf("·") >= 0) title = title.split("·").slice(1).join("·").trim(); }
    return { n: n, cn: cn(n), title: title, era: era, chars: chars, mins: Math.max(1, Math.round(chars / 400)),
      html: r.html, paras: r.paras, recap: S.recaps[String(n)] || "", date: meta.date || "", mood: meta.mood || "jin" };
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.body.appendChild(s);
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function get1(f, type) {
    return fetch(f, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(f); return type === "json" ? r.json() : r.text(); });
  }
  // 先找 chapters/ 或 data/ 文件夹里的；网页上传时文件夹被拆平了的话，就在根目录找同名文件
  function get(f, type) {
    return get1(f, type).catch(function (e) { var b = f.split("/").pop(); if (b === f) throw e; return get1(b, type); });
  }
  function opt(f, type) { return get(f, type).catch(function (e) { if (window.console) console.warn("没读到 " + f + "，用网页里原来的那份。", e); return null; }); }

  Promise.all([opt("data/book.json", "json"), opt("data/characters.json", "json"), opt("data/timeline.json", "json"), opt("data/recaps.json", "json"), opt("data/cover.svg")]).then(function (r) {
    var B = r[0];
    if (B) {
      ["title", "series", "series_no", "desc", "blurb", "blurb_paras", "epigraph", "foot", "toc_note_extra", "series_nav", "era_legend", "legend_now", "gauge"].forEach(function (k) { if (B[k] !== undefined) D[k] = B[k]; });
      if (B.group) S.group = B.group;
      if (B.chapters) S.meta = B.chapters;
      if (B.rules) ["special", "prefix", "inline", "fx", "after"].forEach(function (k) { if (B.rules[k]) S.rules[k] = B.rules[k]; });
    }
    if (r[1] && r[1].people) D.people = r[1];
    if (r[2]) D.timeline = r[2];
    if (r[3]) S.recaps = r[3];
    if (r[4]) D.cover_full = r[4].trim();
    setMarks((D.people || {}).people);
    var files = [];
    for (var i = 1; i <= S.count; i++) files.push("chapters/ch" + pad(i) + ".md");
    return Promise.all(files.map(function (f) { return get(f); }));
  }).then(function (texts) {
    D.chapters = texts.map(function (t, i) { return build(i + 1, t); });
    D.total = D.chapters.reduce(function (s, c) { return s + c.chars; }, 0);
    box.textContent = JSON.stringify(D);
    window.READER_WAIT = true;   // 等 features.js 加载完再启动
    return load("reader.js");
  }).then(function () { return load("wt.js"); }).then(function () { return load("features.js"); }).catch(function (e) {
    var v = document.getElementById("view");
    if (v) v.innerHTML = '<p style="padding:40px 20px;text-align:center">正文没有加载出来（' + String(e && e.message || e) + '）。请刷新一下；如果是直接双击打开的本地文件，需要放到网站上才能读取。</p>';
  });
})();
