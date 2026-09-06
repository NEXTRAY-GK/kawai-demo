/* 有限会社カワイ製作所 デモサイト — 2026-09-03 設計しなおし
   外部ライブラリ0件。スクロールを読む処理は1本の rAF にまとめてある。
   ⚠️「視差効果を減らす」がONの端末では、動きを全部止めて静止で成立させる。 */
(function () {
  'use strict';
  var d = document;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 年 ---------- */
  Array.prototype.forEach.call(d.querySelectorAll('[data-year]'), function (e) {
    e.textContent = new Date().getFullYear();
  });

  /* ---------- メニュー ---------- */
  var burger = d.getElementById('burger'), nav = d.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      d.body.style.overflow = open ? 'hidden' : '';
    });
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        d.body.style.overflow = '';
      });
    });
  }

  /* ---------- 出方（下から現れる） ---------- */
  var targets = d.querySelectorAll('.rv, .rvm');
  if (!('IntersectionObserver' in window) || calm) {
    Array.prototype.forEach.call(targets, function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (e) { io.observe(e); });
  }

  /* ---------- トン数の細い線 ---------- */
  var bars = d.querySelectorAll('.bar[data-w]');
  if (bars.length) {
    if (!('IntersectionObserver' in window) || calm) {
      Array.prototype.forEach.call(bars, function (b) { b.style.setProperty('--w', b.dataset.w); });
    } else {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.style.setProperty('--w', en.target.dataset.w);
          io2.unobserve(en.target);
        });
      }, { threshold: 0.3 });
      Array.prototype.forEach.call(bars, function (b) { io2.observe(b); });
    }
  }

  /* ---------- 送り帯 ----------
     流すのは CSS の animation。JSは同じ並びを2周ぶん置いて継ぎ目を消すだけ。
     ⚠️ rAF で毎フレーム transform を書くと、描画が張り付いて画面が真っ白になる。
        2026-09-03 に一度その状態を作って、CSSに戻した。 */
  var marq = d.querySelector('.marq-t');
  if (marq && !calm) marq.innerHTML += marq.innerHTML;

  /* ---------- 方眼（カーソルの周りだけ点が起きる） ----------
     CSS の --mx/--my を書き換えるだけ。画面に入っている面しか触らない。
     ⚠️ pointermove を直に書くと毎ミリ秒走る。必ず rAF で間引く。
     ⚠️ カーソルの無い端末（hover:none）と「視差効果を減らす」のときは何もしない。
        CSS 側で薄い方眼が全面に出る形にしてある。 */
  var inks = d.querySelectorAll('.sec--ink');
  if (inks.length && !calm && matchMedia('(hover:hover)').matches) {
    var mx = 0, my = 0, mtick = false;
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (mtick) return;
      mtick = true;
      requestAnimationFrame(function () {
        mtick = false;
        Array.prototype.forEach.call(inks, function (s) {
          var r = s.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) return;
          s.style.setProperty('--mx', (mx - r.left) + 'px');
          s.style.setProperty('--my', (my - r.top) + 'px');
        });
      });
    }, { passive: true });
  }

  /* ---------- スクロール（1本のrAFに集約） ---------- */
  var hd = d.getElementById('hd');
  var heroImg = d.querySelector('.hero-bg img');
  var phImg = d.querySelector('.ph-bg img');
  var last = 0, ticking = false, prevY = 0;

  function frame() {
    ticking = false;
    var y = scrollY;

    if (hd) {
      hd.classList.toggle('solid', y > 40);
      /* 下へ送っているあいだは頭を隠す。上に戻すと出す */
      hd.classList.toggle('up', y > 420 && y > prevY && !(nav && nav.classList.contains('open')));
    }
    if (!calm) {
      if (heroImg && y < innerHeight * 1.3) heroImg.style.transform = 'translate3d(0,' + (y * 0.16) + 'px,0)';
      if (phImg && y < innerHeight * 1.3) phImg.style.transform = 'translate3d(0,' + (y * 0.12) + 'px,0)';
    }
    prevY = y;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  addEventListener('scroll', onScroll, { passive: true });

  frame();
})();
