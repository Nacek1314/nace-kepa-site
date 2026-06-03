// Midnight Cyber-Premium — cinematic engine
// Single client-side script that powers:
//   • scroll progress bar
//   • mouse-tracked spotlight (CSS vars --mx, --my)
//   • magnetic buttons        (data-magnetic)
//   • 3D tilt cards           (data-tilt)
//   • scroll-reveal           (data-reveal[, data-reveal-delay])
//   • parallax layers         (data-parallax="0.3")
//   • custom cursor           (auto, snaps to a/button/[data-magnetic])
//   • split-char text reveal  (data-split)
//   • animated counters       (data-counter="1234"[, data-counter-suffix])
//
// All effects respect prefers-reduced-motion and pointer:coarse (touch).

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer: fine)').matches;

// ---------- 1. Scroll progress bar ----------
function mountScrollBar() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${p})`;
    document.documentElement.style.setProperty('--scroll-y', String(window.scrollY));
    document.documentElement.style.setProperty('--scroll-p', p.toFixed(4));
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// ---------- 2. Mouse spotlight ----------
function mountSpotlight() {
  if (!fine) return;
  const root = document.documentElement;
  let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
  const tick = () => {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    root.style.setProperty('--mx', `${x.toFixed(1)}px`);
    root.style.setProperty('--my', `${y.toFixed(1)}px`);
    raf = 0;
  };
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
}

// ---------- 3. Magnetic buttons ----------
function mountMagnetic() {
  if (!fine) return;
  const els = document.querySelectorAll<HTMLElement>('[data-magnetic]');
  els.forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.35;
    const radius = Number(el.dataset.magneticRadius) || 80;
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const apply = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(apply);
      else raf = 0;
    };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius * 1.4) return;
      tx = dx * strength;
      ty = dy * strength;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  });
}

// ---------- 4. 3D tilt cards ----------
function mountTilt() {
  if (!fine) return;
  const els = document.querySelectorAll<HTMLElement>('[data-tilt]');
  els.forEach((el) => {
    const max = Number(el.dataset.tilt) || 8; // deg
    const glare = el.dataset.tiltGlare !== 'off';
    if (glare) {
      const g = document.createElement('span');
      g.className = 'tilt-glare';
      el.appendChild(g);
    }
    let raf = 0, lastEvent: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      if (!lastEvent) return;
      const r = el.getBoundingClientRect();
      const px = (lastEvent.clientX - r.left) / r.width;
      const py = (lastEvent.clientY - r.top) / r.height;
      const rx = (0.5 - py) * max * 2;
      const ry = (px - 0.5) * max * 2;
      el.style.setProperty('--tilt-rx', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--tilt-ry', `${ry.toFixed(2)}deg`);
      el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
    };
    el.addEventListener('pointerenter', () => el.classList.add('is-tilting'));
    el.addEventListener('pointermove', (e) => {
      lastEvent = e;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--tilt-rx', '0deg');
      el.style.setProperty('--tilt-ry', '0deg');
    });
  });
}

// ---------- 5. Scroll reveal ----------
function mountReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay || 0);
          setTimeout(() => el.classList.add('is-visible'), delay);
          io.unobserve(el);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
  );
  els.forEach((el) => io.observe(el));
}

// ---------- 6. Parallax layers ----------
function mountParallax() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!els.length) return;
  let raf = 0;
  const tick = () => {
    raf = 0;
    const y = window.scrollY;
    for (const el of els) {
      const factor = Number(el.dataset.parallax) || 0.2;
      el.style.transform = `translate3d(0, ${(y * factor).toFixed(1)}px, 0)`;
    }
  };
  window.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  tick();
}

// ---------- 7. Custom cursor ----------
function mountCursor() {
  if (!fine) return;
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let dx = 0, dy = 0, rx = 0, ry = 0;
  let tx = innerWidth / 2, ty = innerHeight / 2;
  let raf = 0;
  const tick = () => {
    dx += (tx - dx) * 0.55;
    dy += (ty - dy) * 0.55;
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    dot.style.transform = `translate3d(${dx - 4}px, ${dy - 4}px, 0)`;
    ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  window.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
  }, { passive: true });

  // Hover state on interactive elements
  const interactive = 'a, button, [data-magnetic], [data-tilt], input, textarea, select, [role="button"]';
  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    if (t && t.closest && t.closest(interactive)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target as HTMLElement;
    if (t && t.closest && t.closest(interactive)) document.body.classList.remove('cursor-hover');
  });
  window.addEventListener('pointerdown', () => document.body.classList.add('cursor-down'));
  window.addEventListener('pointerup',   () => document.body.classList.remove('cursor-down'));
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = '1'; });
}

// ---------- 8. Split-char text reveal ----------
function mountSplit() {
  const els = document.querySelectorAll<HTMLElement>('[data-split]');
  els.forEach((el) => {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    const text = el.textContent || '';
    el.textContent = '';
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const ch of text) {
      if (ch === ' ') {
        frag.appendChild(document.createTextNode(' '));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'split-char';
      span.textContent = ch;
      span.style.animationDelay = `${(i++ * 28).toFixed(0)}ms`;
      frag.appendChild(span);
    }
    el.appendChild(frag);
  });
}

// ---------- 9. Animated counters ----------
function mountCounters() {
  const els = document.querySelectorAll<HTMLElement>('[data-counter]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => { el.textContent = (el.dataset.counter || '0') + (el.dataset.counterSuffix || ''); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target as HTMLElement;
      const target = Number(el.dataset.counter) || 0;
      const dur = Number(el.dataset.counterDuration) || 1600;
      const suffix = el.dataset.counterSuffix || '';
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(target * eased);
        el.textContent = value.toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
}

// ---------- boot ----------
function boot() {
  mountScrollBar();
  mountReveal();
  mountSplit();
  mountCounters();
  if (reduced) return;
  mountSpotlight();
  mountMagnetic();
  mountTilt();
  mountParallax();
  mountCursor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Re-init on Astro view-transition swap
document.addEventListener('astro:page-load', () => {
  // Some effects need to re-mount after navigation
  mountReveal();
  mountSplit();
  mountCounters();
  if (!reduced) {
    mountMagnetic();
    mountTilt();
    mountParallax();
  }
});

export {};
