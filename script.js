// ============================================================
// Theme toggle (light / dark / auto)
// The <head> already set the initial data-theme before paint;
// this section wires up the buttons and keeps "auto" live.
// ============================================================
const THEME_KEY = 'portfolio-theme-preference';
const root = document.documentElement;
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const themeButtons = document.querySelectorAll('.theme-toggle__btn');

function getStoredPreference() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function storePreference(pref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
}

function applyTheme(preference) {
  const resolved = preference === 'auto'
    ? (darkMediaQuery.matches ? 'dark' : 'light')
    : preference;

  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', preference);

  themeButtons.forEach((btn) => {
    const isActive = btn.dataset.theme === preference;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

applyTheme(getStoredPreference() || 'auto');

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const pref = btn.dataset.theme;
    storePreference(pref);
    applyTheme(pref);
  });
});

darkMediaQuery.addEventListener('change', () => {
  const current = getStoredPreference() || 'auto';
  if (current === 'auto') applyTheme('auto');
});

// ============================================================
// Sidebar: hover to expand on desktop, tap to toggle on mobile
// ============================================================
const sidebar = document.getElementById('sidebar');
const sidebarFab = document.getElementById('sidebarFab');
const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const MOBILE_BREAKPOINT = 760;

function useHoverBehavior() {
  return hoverCapable && window.innerWidth > MOBILE_BREAKPOINT;
}

function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function openSidebar() {
  sidebar.classList.add('is-expanded');
  sidebarFab.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  sidebar.classList.remove('is-expanded');
  sidebarFab.setAttribute('aria-expanded', 'false');
}

sidebar.addEventListener('mouseenter', () => {
  if (useHoverBehavior()) openSidebar();
});

sidebar.addEventListener('mouseleave', () => {
  if (useHoverBehavior()) closeSidebar();
});

sidebarFab.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('is-expanded');
  sidebarFab.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', (e) => {
  if (isMobileViewport() && sidebar.classList.contains('is-expanded') && !sidebar.contains(e.target)) {
    closeSidebar();
  }
});

sidebar.querySelectorAll('.sidebar__nav a, .sidebar__hire').forEach((link) => {
  link.addEventListener('click', () => {
    if (isMobileViewport()) closeSidebar();
  });
});

// ============================================================
// Home mode: top navbar while the hero is in view, sidebar
// once the visitor scrolls past it.
// ============================================================
const heroSection = document.getElementById('top');

if (heroSection && 'IntersectionObserver' in window) {
  const heroObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        document.body.classList.toggle('home-mode', entry.isIntersecting);
      });
    },
    { threshold: 0.5 }
  );
  heroObserver.observe(heroSection);
}

// ============================================================
// Highlight the sidebar nav item for the section in view.
// Uses a center-screen line rather than a visibility ratio, so
// it works correctly even for sections taller than one screen.
// ============================================================
const navLinksByTarget = {};
sidebar.querySelectorAll('.sidebar__nav a').forEach((a) => {
  navLinksByTarget[a.dataset.nav] = a;
});

const trackedSections = document.querySelectorAll('main section[id]');

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        Object.values(navLinksByTarget).forEach((a) => a.classList.remove('is-active'));
        const link = navLinksByTarget[entry.target.id];
        if (link) link.classList.add('is-active');
      });
    },
    { threshold: 0, rootMargin: '-50% 0px -50% 0px' }
  );

  trackedSections.forEach((section) => sectionObserver.observe(section));
}

// ============================================================
// Footer year
// ============================================================
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ============================================================
// Scroll reveal for work cards, timeline items, etc.
// ============================================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealTargets = document.querySelectorAll(
  '.album, .skill, .timeline__item, .edu__item, .about__text, .care-label'
);

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
} else {
  revealTargets.forEach((el) => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}

// ============================================================
// Apparel Design — album galleries
// Each .album has its own ordered photo list inside a hidden
// .album__slides block. Clicking an album's cover loads ONLY that
// album's photos into the shared lightbox below — albums never mix.
// ============================================================
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxTag = document.getElementById('lightboxTag');
const lightboxFilmstrip = document.getElementById('lightboxFilmstrip');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxClose = document.getElementById('lightboxClose');

const albums = Array.from(document.querySelectorAll('.album'));
let currentAlbumSlides = [];
let currentSlide = 0;
let lastFocusedTrigger = null;

function getAlbumSlides(albumEl) {
  return Array.from(albumEl.querySelectorAll('.album__slides img'));
}

function slideData(imgEl) {
  return {
    src: imgEl.currentSrc || imgEl.src,
    alt: imgEl.alt || '',
    title: imgEl.dataset.title || '',
    tag: imgEl.dataset.tag || '',
  };
}

function buildFilmstrip(slides) {
  if (!lightboxFilmstrip) return;
  lightboxFilmstrip.innerHTML = '';
  slides.forEach((imgEl, index) => {
    const data = slideData(imgEl);
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'lightbox__thumb';
    thumb.setAttribute('aria-label', data.title ? `View ${data.title}` : `View photo ${index + 1}`);
    const thumbImg = document.createElement('img');
    thumbImg.src = data.src;
    thumbImg.alt = '';
    thumb.appendChild(thumbImg);
    thumb.addEventListener('click', () => {
      if (index === currentSlide) return;
      // Pick the shorter direction around the loop so the card flies
      // the way you'd expect even when jumping across the filmstrip.
      const forward = (index - currentSlide + currentAlbumSlides.length) % currentAlbumSlides.length;
      const backward = (currentSlide - index + currentAlbumSlides.length) % currentAlbumSlides.length;
      navigate(forward <= backward ? 'next' : 'prev', index);
    });
    lightboxFilmstrip.appendChild(thumb);
  });
}

// Swaps the photo/caption/filmstrip state only — no animation. Used
// for the very first photo in an album (nothing to transition from)
// and as the mid-transition content swap inside navigate() below.
function renderSlide(index) {
  if (!currentAlbumSlides.length) return;
  currentSlide = (index + currentAlbumSlides.length) % currentAlbumSlides.length;
  const data = slideData(currentAlbumSlides[currentSlide]);

  lightboxImage.src = data.src;
  lightboxImage.alt = data.alt;
  lightboxTitle.textContent = data.title;
  lightboxTag.textContent = data.tag;

  if (lightboxFilmstrip) {
    Array.from(lightboxFilmstrip.children).forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === currentSlide);
    });
    const activeThumb = lightboxFilmstrip.children[currentSlide];
    if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  const multiple = currentAlbumSlides.length > 1;
  lightboxPrev.hidden = !multiple;
  lightboxNext.hidden = !multiple;
}

// Card-swipe transition: flies the current photo off in `direction`,
// swaps in the new one once it's off-screen, then slides it in from
// the opposite edge. `targetIndex` lets the filmstrip jump straight
// to a specific photo while still picking the right fly direction.
const prefersReducedMotionLB = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let isAnimating = false;

function navigate(direction, targetIndex) {
  if (!currentAlbumSlides.length) return;
  const nextIndex = targetIndex !== undefined
    ? targetIndex
    : currentSlide + (direction === 'prev' ? -1 : 1);

  if (prefersReducedMotionLB || isAnimating || currentAlbumSlides.length < 2) {
    renderSlide(nextIndex);
    return;
  }

  isAnimating = true;
  const exitClass = direction === 'prev' ? 'is-leaving-right' : 'is-leaving-left';
  const enterClass = direction === 'prev' ? 'is-entering-left' : 'is-entering-right';

  lightboxImage.classList.remove('is-dragging');
  lightboxImage.classList.add(exitClass);

  const finish = () => {
    lightboxImage.removeEventListener('transitionend', finish);
    renderSlide(nextIndex);
    // Place the new photo off-screen on the entering side (no
    // transition), then release it on the next frame so it animates
    // back to center — the "slide in" half of the swap.
    lightboxImage.classList.remove(exitClass);
    lightboxImage.classList.add('is-snapping', enterClass);
    void lightboxImage.offsetWidth; // force a reflow so the off-screen position is committed
    lightboxImage.classList.remove('is-snapping', enterClass);
    isAnimating = false;
  };

  lightboxImage.addEventListener('transitionend', finish, { once: true });
  // Safety net in case transitionend never fires for some reason.
  window.setTimeout(() => { if (isAnimating) finish(); }, 420);
}

function openAlbum(albumEl, triggerEl) {
  const slides = getAlbumSlides(albumEl);
  if (!slides.length) return;
  currentAlbumSlides = slides;
  lastFocusedTrigger = triggerEl || null;
  buildFilmstrip(currentAlbumSlides);
  renderSlide(0);
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  if (lastFocusedTrigger) lastFocusedTrigger.focus();
}

albums.forEach((albumEl) => {
  const cover = albumEl.querySelector('.album__cover');
  if (!cover) return;
  cover.addEventListener('click', () => openAlbum(albumEl, cover));

  // Keep each album's "N Photos" badge accurate automatically —
  // it counts whatever real <img> tags are inside .album__slides.
  const countEl = albumEl.querySelector('.album__count');
  if (countEl) {
    const total = getAlbumSlides(albumEl).length;
    countEl.textContent = `${total} Photo${total === 1 ? '' : 's'}`;
  }
});

if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigate('prev'));
if (lightboxNext) lightboxNext.addEventListener('click', () => navigate('next'));
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

if (lightbox) {
  lightbox.querySelectorAll('[data-lightbox-dismiss]').forEach((el) => {
    el.addEventListener('click', closeLightbox);
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') navigate('next');
    if (e.key === 'ArrowLeft') navigate('prev');
  });

  // Card-swipe drag: the photo follows the pointer in real time while
  // dragging (with a slight rotation, like a card being flicked off a
  // stack); releasing past the threshold commits to a full swipe,
  // otherwise it springs back to center.
  const DRAG_THRESHOLD = 80;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragDeltaX = 0;

  lightboxImage.addEventListener('pointerdown', (e) => {
    if (isAnimating || currentAlbumSlides.length < 2) return;
    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    lightboxImage.classList.add('is-dragging');
    lightboxImage.setPointerCapture && lightboxImage.setPointerCapture(e.pointerId);
  });

  lightboxImage.addEventListener('pointermove', (e) => {
    if (dragPointerId === null || e.pointerId !== dragPointerId) return;
    dragDeltaX = e.clientX - dragStartX;
    const rotate = dragDeltaX / 22;
    const fade = Math.max(1 - Math.abs(dragDeltaX) / 480, 0.45);
    lightboxImage.style.transform = `translateX(${dragDeltaX}px) rotate(${rotate}deg)`;
    lightboxImage.style.opacity = String(fade);
  });

  function endDrag(e) {
    if (dragPointerId === null || (e && e.pointerId !== dragPointerId)) return;
    dragPointerId = null;
    lightboxImage.classList.remove('is-dragging');
    const delta = dragDeltaX;
    dragDeltaX = 0;

    // Clear the inline drag position so the next class-driven
    // transition animates from this exact on-screen spot.
    lightboxImage.style.transform = '';
    lightboxImage.style.opacity = '';

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      navigate(delta < 0 ? 'next' : 'prev');
    }
  }

  lightboxImage.addEventListener('pointerup', endDrag);
  lightboxImage.addEventListener('pointercancel', endDrag);
}

// ============================================================
// Seamless marquee
// Driven entirely by pixel math rather than a CSS keyframe, so it
// never "jumps" or visibly resets: the track is duplicated enough
// times to always cover the viewport, and position wraps by exactly
// one copy's width — a point at which the content is pixel-identical
// to where it started, so the wrap is invisible.
// ============================================================
function initSeamlessMarquee(marqueeEl) {
  const track = marqueeEl.querySelector('.marquee__track');
  if (!track) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseItems = Array.from(track.children);
  const SPEED = 40; // pixels per second

  let setWidth = 0;
  let x = 0;
  let rafId = null;
  let lastTimestamp = null;

  function rebuild() {
    if (rafId) cancelAnimationFrame(rafId);
    track.style.transform = 'translateX(0)';
    track.innerHTML = '';

    // Lay down one copy first to measure a single set's width.
    baseItems.forEach((el) => track.appendChild(el.cloneNode(true)));
    setWidth = track.scrollWidth;

    // Keep adding copies until the track comfortably covers at least
    // two full viewport-widths beyond one set — guarantees no gap
    // ever appears while scrolling, at any screen size.
    const minWidth = marqueeEl.clientWidth * 2 + setWidth;
    let guard = 0;
    while (track.scrollWidth < minWidth && guard < 20) {
      baseItems.forEach((el) => track.appendChild(el.cloneNode(true)));
      guard++;
    }

    x = 0;
    lastTimestamp = null;
    if (!prefersReduced) rafId = requestAnimationFrame(step);
  }

  function step(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    x -= SPEED * dt;
    if (x <= -setWidth) x += setWidth;

    track.style.transform = `translateX(${x}px)`;
    rafId = requestAnimationFrame(step);
  }

  rebuild();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 200);
  });
}

document.querySelectorAll('.marquee').forEach(initSeamlessMarquee);