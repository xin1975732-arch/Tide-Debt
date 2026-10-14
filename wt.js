/* 围涂 · wt.js —— 这本书自己的几处版式：
 * 顶栏压在夜色上时透明、章节的情绪（紧 / 灯 / 插章）、章首的案卷号、
 * 整页书封、目录的日期和“核”字、侧边围垦进度、正文里的小动静（锁屏亮一下、指甲划一道、远处三声）。
 * 在 reader.js 之后、features.js 之前加载。 */
(function () {
  "use strict";
  var R = window.Reader;
  if (!R) return;
  var D = R.data, CH = R.chapters, N = CH.length;
  var esc = R.esc, el = R.el, pad = R.pad;
  var root = document.documentElement;
  var app = document.getElementById("app");
  var view = document.getElementById("view");
  var bar = document.querySelector(".bar");
  var gauge = document.querySelector(".gauge");

  /* ---------- 顶栏：压在夜色（章首、书封）上时透明 ---------- */
  function paintBar() {
    if (!bar) return;
    var v = app.getAttribute("data-view");
    var dark = v === "home" ? view.querySelector(".hero") : v === "chapter" ? view.querySelector(".ch-head") : null;
    var over = !!dark && dark.getBoundingClientRect().bottom > bar.offsetHeight + 2;
    bar.classList.toggle("over", over);
  }
  window.addEventListener("scroll", paintBar, { passive: true });
  window.addEventListener("resize", paintBar);

  /* ---------- 章节的情绪 ---------- */
  var fxIO = null;
  R.on("leave", function () {
    root.removeAttribute("data-mood");
    if (fxIO) { fxIO.disconnect(); fxIO = null; }
  });

  /* ---------- 章首 ---------- */
  R.on("chapter", function (n, v) {
    var c = CH[n - 1];
    if (c.mood === "deng" || c.mood === "cha") root.setAttribute("data-mood", c.mood);
    var hd = v.querySelector(".ch-head-in");
    if (hd) {
      var no = hd.querySelector(".ch-no");
      if (no) no.textContent = "第" + c.cn + "章";
      var cs = el("p", { class: "case" }, "<span>No." + pad(n) + "</span><i></i><b>" + esc(c.era ? "插章" : c.date) + "</b>");
      hd.insertBefore(cs, no || hd.firstChild);
      var meta = v.querySelector(".ch-head > .ch-meta");
      if (meta) hd.appendChild(meta);
    }
    // 全书最后：小本子末页那一行
    if (n === N) {
      var end = v.querySelector(".ch-end");
      if (end) {
        end.insertAdjacentHTML("beforeend",
          '<figure class="epi-end"><blockquote><p>四十八户，欠。</p></blockquote>' +
          "<figcaption>——小本子末页，二〇一一年腊月二十，厂门落锁</figcaption></figure>" +
          '<p class="fin-s">围涂　·　账本三部曲 第三部</p>');
      }
    }
    watchFx(v);
    paintGauge();
    requestAnimationFrame(paintBar);
  });

  /* ---------- 正文里的小动静 ---------- */
  function watchFx(v) {
    var els = v.querySelectorAll("[data-fx]");
    if (!els.length) return;
    function fire(e) {
      var fx = e.getAttribute("data-fx");
      if (fx === "lock") e.classList.add("lit");
      if (fx === "scratch") v.querySelectorAll(".scratch-t").forEach(function (s) { s.classList.add("on"); });
      if (fx === "ending") {
        var th = v.querySelector(".thud");
        if (th) th.classList.add("go");
        if (window.WT_KNOCK) window.WT_KNOCK(3);
      }
    }
    if (!("IntersectionObserver" in window)) { els.forEach(fire); return; }
    fxIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { fire(en.target); fxIO.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -22% 0px", threshold: 0.6 });
    els.forEach(function (e) { fxIO.observe(e); });
  }

  /* ---------- 围垦进度：读一段，往外多筑一道塘 ---------- */
  var lis = gauge ? gauge.querySelectorAll("li") : [];
  function paintGauge() {
    if (!gauge || !lis.length) return;
    var p = parseFloat(gauge.style.getPropertyValue("--p") || "0") || 0;
    var built = Math.max(1, Math.ceil(p * lis.length));
    lis.forEach(function (li) {
      var i = parseInt(li.getAttribute("data-i"), 10);
      li.classList.toggle("on", i <= built);
      li.classList.toggle("cur", i === built);
    });
  }
  window.addEventListener("scroll", paintGauge, { passive: true });

  /* ---------- 书封：整整一屏，六月清晨的海涂 ---------- */
  R.on("home", function (v) {
    var hero = v.querySelector(".hero");
    if (hero) {
      var txt = hero.querySelector(".hero-text");
      var series = txt.querySelector(".series"), wm = txt.querySelector(".wordmark"), epi = txt.querySelector(".epi");
      var cta = txt.querySelector(".cta"), quick = txt.querySelector(".quick");
      hero.setAttribute("aria-label", "书封");
      hero.innerHTML = D.cover_full || "";
      if (epi) epi.classList.add("epi-cover");
      var top = el("div", { class: "hero-top" });
      [series, wm, epi].forEach(function (x) { if (x) top.appendChild(x); });
      var bot = el("div", { class: "hero-bot" });
      [cta, quick].forEach(function (x) { if (x) bot.appendChild(x); });
      hero.appendChild(top); hero.appendChild(bot);
      var paras = (D.blurb_paras || [D.blurb]).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
      hero.insertAdjacentHTML("afterend",
        '<section class="intro" aria-label="简介"><p class="intro-k">上林县 · 二塘 · 中篇小说</p><div class="blurb">' + paras + "</div></section>");
    }
    // 目录：标题下面写日期，插章盖红框，读完盖“核”
    var mulu = v.querySelector(".mulu");
    if (mulu) {
      var h2 = mulu.querySelector("h2");
      if (h2) {
        var hd = el("header", { class: "mulu-h" });
        h2.parentNode.insertBefore(hd, h2);
        hd.appendChild(h2);
        hd.appendChild(el("p", { text: "二十章 · 从腊月二十二到六月" }));
      }
      mulu.querySelectorAll(".toc a").forEach(function (a) {
        var c = CH[parseInt(a.getAttribute("data-n"), 10) - 1];
        var tt = a.querySelector(".toc-t"), tagWrap = a.querySelector(".toc-tag").parentNode, m = a.querySelector(".toc-m");
        if (c.era) tt.innerHTML = "<em>插章</em>" + esc(c.title);
        var main = el("span", { class: "toc-main" });
        main.appendChild(tt);
        main.appendChild(el("span", { class: "toc-d", text: c.date }));
        var r = el("span", { class: "toc-r" });
        r.appendChild(tagWrap); r.appendChild(m);
        r.appendChild(el("i", { class: "toc-ok", "aria-hidden": "true", text: "核" }));
        a.appendChild(main); a.appendChild(r);
      });
    }
    requestAnimationFrame(paintBar);
  });

  R.on("view", function () { requestAnimationFrame(paintBar); });
})();
