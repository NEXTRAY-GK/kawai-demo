/* 有限会社カワイ製作所 デモサイト / assets/site.js
   NextRay 2026-09

   動きは3つしか作らない ── 送る（横）・叩く（縦）・抜ける（奥）。
   スクロールを読む処理は全部1本の rAF にまとめる。
   ライブラリは読まない。JSが死んでも中身は全部見えたままにする。 */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vh = innerHeight;

  /* ============ 1 ヘッダー ============ */
  var hd = document.getElementById('hd');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  var lastY = 0;

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      document.documentElement.style.overflow = open ? 'hidden' : '';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && nav.classList.contains('is-open')) burger.click();
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) burger.click();
    });
  }

  /* ============ 2 送り帯 ============ */
  /* 常に左へ流れる。スクロールした量だけ速くなる（送りが速まる） */
  var marq = document.querySelector('.marq-t');
  var marqX = 0, marqW = 0, boost = 0;
  if (marq && !reduce) {
    // 同じ並びを2本つないで、切れ目なく回す
    marq.innerHTML += marq.innerHTML;
    marqW = marq.scrollWidth / 2;
  }

  /* ============ 3 横に送る（rail） ============ */
  /* CSSの既定は縦積み。ここで条件が揃ったときだけ横送りに切り替える。
     ⚠️ 逆にしない。JSが死んだ端末や「視差効果を減らす」がONの端末で、
        カードが画面の外に取り残されて真っ黒な画面になる。 */
  var railOuter = document.querySelector('.rail-outer');
  var rail = document.querySelector('.rail');
  var railRange = 0, railOn = false;
  function measureRail() {
    if (!rail || !railOuter) return;
    var want = !reduce && innerWidth > 860;
    if (want !== railOn) {
      railOn = want;
      document.documentElement.classList.toggle('rail-on', want);
    }
    if (!want) {
      railOuter.style.height = '';
      rail.style.transform = '';
      railRange = 0;
      return;
    }
    railRange = Math.max(0, rail.scrollWidth - innerWidth + 40);
    // 横に流す距離ぶん、縦の高さを持たせる
    railOuter.style.height = (innerHeight + railRange) + 'px';
  }

  /* ============ 4 画面に入ったら出す ============ */
  var rvs = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || reduce) {
    Array.prototype.forEach.call(rvs, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    Array.prototype.forEach.call(rvs, function (el) { io.observe(el); });
  }

  /* ============ 5 数字を走らせる ============ */
  /* カウントアップではなく、その要素が画面を通った量に紐づけて動かす。
     スクロールを止めれば数字も止まる。プレスの送りと同じ挙動にする。 */
  var nums = [].slice.call(document.querySelectorAll('[data-to]'));
  nums.forEach(function (el) {
    el.dataset.dec = (el.dataset.to.split('.')[1] || '').length;
    if (reduce) el.textContent = (+el.dataset.to).toFixed(el.dataset.dec);
  });

  /* ============ 6 パララックス ============ */
  var paras = [].slice.call(document.querySelectorAll('.hero-bg,.call-bg,.ph-bg'));

  /* ============ 7 1本のループ ============ */
  var ticking = false, prevY = scrollY;
  function frame() {
    ticking = false;
    var y = scrollY;

    /* ヘッダー：下へ動かしたら隠す。24px より上なら常に出す */
    if (hd) {
      hd.classList.toggle('is-stuck', y > 24);
      if (!nav || !nav.classList.contains('is-open')) {
        hd.classList.toggle('is-hide', y > 220 && y > lastY);
      }
      lastY = y;
    }

    /* パララックス：見えている間だけ動かす。動きを断っている端末では触らない */
    for (var i = 0; reduce ? false : i < paras.length; i++) {
      var p = paras[i], r = p.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      p.style.transform = 'translate3d(0,' + (-r.top * 0.14).toFixed(1) + 'px,0)';
    }

    /* 数字：要素が下から上がってきた分だけ進める。
       ただし一度満ちたら戻さない。スクロールを戻したときに数字が減ると、
       見ている側には「壊れている」としか映らないため。 */
    for (var j = 0; j < nums.length; j++) {
      var el = nums[j];
      if (el.dataset.done) continue;
      var b = el.getBoundingClientRect();
      if (b.top > vh) continue;
      var prog = Math.min(1, Math.max(0, (vh - b.top) / (vh * 0.55)));
      if (prog <= +(el.dataset.p || 0)) continue;      // 戻りは捨てる
      el.dataset.p = prog;
      var to = +el.dataset.to;
      el.textContent = (to * prog).toFixed(el.dataset.dec);
      var fig = el.closest('.fig');
      if (fig) fig.style.setProperty('--p', prog.toFixed(3));
      if (prog >= 1) el.dataset.done = '1';
    }

    /* 横に送る */
    if (rail && railOuter && railOn && railRange > 0) {
      var ro = railOuter.getBoundingClientRect();
      var k = Math.min(1, Math.max(0, -ro.top / railRange));
      rail.style.transform = 'translate3d(' + (-k * railRange).toFixed(1) + 'px,0,0)';
    }

    prevY = y;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () {
    vh = innerHeight; measureRail(); onScroll();
  }, { passive: true });

  /* 送り帯だけは、スクロールが止まっていても回し続ける */
  var last = 0;
  function loop(t) {
    var dt = last ? Math.min(64, t - last) : 16; last = t;
    if (marq && marqW) {
      boost += (Math.abs(scrollY - prevY) * 0.5 - boost) * 0.08;
      marqX -= (0.032 + boost * 0.004) * dt;
      if (marqX <= -marqW) marqX += marqW;
      marq.style.transform = 'translate3d(' + marqX.toFixed(1) + 'px,0,0)';
    }
    requestAnimationFrame(loop);
  }
  if (!reduce) requestAnimationFrame(loop);

  /* ============ 8 起動 ============ */
  measureRail();
  onScroll();
  addEventListener('load', function () { measureRail(); onScroll(); });

  /* 年 */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
