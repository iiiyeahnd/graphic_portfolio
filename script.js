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
  '.work-card, .timeline__item, .edu__item, .about__text, .care-label'
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
// Work gallery (lightbox)
// Every work-card with a real <img> (the "Add image" slots don't
// count until a real image replaces them) joins the gallery, in
// the order the cards appear on the page.
// ============================================================
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxTag = document.getElementById('lightboxTag');
const lightboxFilmstrip = document.getElementById('lightboxFilmstrip');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxClose = document.getElementById('lightboxClose');

const galleryTriggers = Array.from(document.querySelectorAll('.work-card__trigger'));
let currentSlide = 0;
let lastFocusedTrigger = null;

function slideData(trigger) {
  const img = trigger.querySelector('img');
  const card = trigger.closest('.work-card');
  const titleEl = card ? card.querySelector('.work-card__meta h3') : null;
  const tagEl = card ? card.querySelector('.work-card__tag') : null;
  return {
    src: img ? img.currentSrc || img.src : '',
    alt: img ? img.alt : '',
    title: titleEl ? titleEl.textContent.trim() : '',
    tag: tagEl ? tagEl.textContent.trim() : '',
  };
}

function buildFilmstrip() {
  if (!lightboxFilmstrip) return;
  lightboxFilmstrip.innerHTML = '';
  galleryTriggers.forEach((trigger, index) => {
    const data = slideData(trigger);
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'lightbox__thumb';
    thumb.setAttribute('aria-label', data.title ? `View ${data.title}` : `View design ${index + 1}`);
    const thumbImg = document.createElement('img');
    thumbImg.src = data.src;
    thumbImg.alt = '';
    thumb.appendChild(thumbImg);
    thumb.addEventListener('click', () => showSlide(index));
    lightboxFilmstrip.appendChild(thumb);
  });
}

function showSlide(index) {
  if (!galleryTriggers.length) return;
  currentSlide = (index + galleryTriggers.length) % galleryTriggers.length;
  const data = slideData(galleryTriggers[currentSlide]);

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

  const multiple = galleryTriggers.length > 1;
  lightboxPrev.hidden = !multiple;
  lightboxNext.hidden = !multiple;
}

function openLightbox(index, triggerEl) {
  if (!galleryTriggers.length) return;
  lastFocusedTrigger = triggerEl || null;
  buildFilmstrip();
  showSlide(index);
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

galleryTriggers.forEach((trigger, index) => {
  trigger.addEventListener('click', () => openLightbox(index, trigger));
});

if (lightboxPrev) lightboxPrev.addEventListener('click', () => showSlide(currentSlide - 1));
if (lightboxNext) lightboxNext.addEventListener('click', () => showSlide(currentSlide + 1));
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

if (lightbox) {
  lightbox.querySelectorAll('[data-lightbox-dismiss]').forEach((el) => {
    el.addEventListener('click', closeLightbox);
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showSlide(currentSlide + 1);
    if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
  });

  // Swipe / drag to move between images
  let pointerStartX = null;
  lightboxImage.addEventListener('pointerdown', (e) => {
    pointerStartX = e.clientX;
  });
  lightboxImage.addEventListener('pointerup', (e) => {
    if (pointerStartX === null) return;
    const delta = e.clientX - pointerStartX;
    if (Math.abs(delta) > 50) {
      showSlide(currentSlide + (delta < 0 ? 1 : -1));
    }
    pointerStartX = null;
  });
}

// ============================================================
// Placeholder collage — empty "Add image" slots preview the
// designs already in the gallery instead of sitting blank.
// Automatically picks up real images once they're added; does
// nothing (harmlessly) if the gallery is still empty.
// ============================================================
const collageTargets = document.querySelectorAll('.work-card__placeholder-collage');
if (collageTargets.length && galleryTriggers.length) {
  const sourceImages = galleryTriggers
    .map((trigger) => trigger.querySelector('img'))
    .filter(Boolean)
    .slice(0, 4);

  collageTargets.forEach((target) => {
    sourceImages.forEach((sourceImg) => {
      const img = document.createElement('img');
      img.src = sourceImg.currentSrc || sourceImg.src;
      img.alt = '';
      target.appendChild(img);
    });
  });
}