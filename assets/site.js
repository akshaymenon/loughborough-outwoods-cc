const menuButton = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');
if (menuButton && navLinks) {
  const setMenuOpen = (open) => {
    navLinks.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  menuButton.addEventListener('click', () => setMenuOpen(!navLinks.classList.contains('open')));
  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenuOpen(false);
      menuButton.focus();
    }
  });
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

const mainNav = document.querySelector('.nav-links');
if (mainNav && !mainNav.querySelector('a[href*="/cricket/"]')) {
  const cricketLink = document.createElement('a');
  cricketLink.href = '/cricket/';
  cricketLink.textContent = 'Fixtures & Results';
  const juniorsLink = Array.from(mainNav.querySelectorAll('a')).find((link) => link.textContent.trim() === 'Juniors');
  if (juniorsLink) mainNav.insertBefore(cricketLink, juniorsLink);
  else mainNav.insertBefore(cricketLink, mainNav.firstChild);
}
if (mainNav && !mainNav.querySelector('a[href*="/juniors/"]')) {
  const juniorsLink = document.createElement('a');
  juniorsLink.href = '/juniors/';
  juniorsLink.textContent = 'Juniors';
  const galleryLink = Array.from(mainNav.querySelectorAll('a')).find((link) => link.textContent.trim() === 'Gallery');
  if (galleryLink) mainNav.insertBefore(juniorsLink, galleryLink);
  else mainNav.insertBefore(juniorsLink, mainNav.firstChild);
}

const clubFooterLinks = document.querySelector('footer .footer-grid > div:nth-child(2) .footer-links');
if (clubFooterLinks && !clubFooterLinks.querySelector('a[href*="/cricket/"]')) {
  const cricketFooterLink = document.createElement('a');
  cricketFooterLink.href = '/cricket/';
  cricketFooterLink.textContent = 'Fixtures & results';
  const juniorsFooterLink = Array.from(clubFooterLinks.querySelectorAll('a')).find((link) => link.textContent.trim() === 'Juniors');
  if (juniorsFooterLink) clubFooterLinks.insertBefore(cricketFooterLink, juniorsFooterLink);
  else clubFooterLinks.appendChild(cricketFooterLink);
}
if (clubFooterLinks && !clubFooterLinks.querySelector('a[href*="/juniors/"]')) {
  const juniorsFooterLink = document.createElement('a');
  juniorsFooterLink.href = '/juniors/';
  juniorsFooterLink.textContent = 'Juniors';
  const galleryFooterLink = Array.from(clubFooterLinks.querySelectorAll('a')).find((link) => link.textContent.trim() === 'Gallery');
  if (galleryFooterLink) clubFooterLinks.insertBefore(juniorsFooterLink, galleryFooterLink);
  else clubFooterLinks.appendChild(juniorsFooterLink);
}

if (clubFooterLinks && !clubFooterLinks.querySelector('a[href*="cricket-club-loughborough"]')) {
  const loughboroughCricketLink = document.createElement('a');
  loughboroughCricketLink.href = '/cricket-club-loughborough/';
  loughboroughCricketLink.textContent = 'Cricket in Loughborough';
  const clubShopLink = Array.from(clubFooterLinks.querySelectorAll('a')).find((link) => link.textContent.trim() === 'Club shop');
  if (clubShopLink) clubFooterLinks.insertBefore(loughboroughCricketLink, clubShopLink);
  else clubFooterLinks.appendChild(loughboroughCricketLink);
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const instagramFeed = document.querySelector('[data-instagram-feed]');
if (instagramFeed) {
  const feedId = instagramFeed.dataset.feedId;
  const track = instagramFeed.querySelector('[data-instagram-track]');
  const prevButton = instagramFeed.querySelector('[data-instagram-prev]');
  const nextButton = instagramFeed.querySelector('[data-instagram-next]');

  const updateInstagramArrows = () => {
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
    if (prevButton) prevButton.disabled = track.scrollLeft <= 2;
    if (nextButton) nextButton.disabled = track.scrollLeft >= maxScroll;
  };

  const scrollInstagram = (direction) => {
    if (!track) return;
    const card = track.querySelector('.instagram-card');
    const gap = 22;
    const amount = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * amount, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
  };

  if (prevButton) prevButton.addEventListener('click', () => scrollInstagram(-1));
  if (nextButton) nextButton.addEventListener('click', () => scrollInstagram(1));
  if (track) track.addEventListener('scroll', updateInstagramArrows, { passive: true });
  window.addEventListener('resize', updateInstagramArrows);

  if (feedId && track) {
    fetch(`https://feeds.behold.so/${feedId}`)
      .then((response) => {
        if (!response.ok) throw new Error('Instagram feed request failed');
        return response.json();
      })
      .then((data) => {
        const posts = Array.isArray(data.posts) ? data.posts.slice(0, 6) : [];
        if (!posts.length) throw new Error('No Instagram posts returned');

        track.innerHTML = posts.map((post) => {
          const imageUrl = post?.sizes?.medium?.mediaUrl || post?.sizes?.small?.mediaUrl || post.thumbnailUrl || post.mediaUrl;
          const alt = post.altText || post.prunedCaption || 'Loughborough Outwoods Instagram post';
          const safeAlt = String(alt).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const href = post.permalink || 'https://www.instagram.com/lborooutwoodscc';
          return `<a class="instagram-card" href="${href}" target="_blank" rel="noreferrer" aria-label="Open Instagram post"><img src="${imageUrl}" alt="${safeAlt}" loading="lazy" decoding="async"></a>`;
        }).join('');

        requestAnimationFrame(updateInstagramArrows);
      })
      .catch(() => {
        track.innerHTML = '<p class="instagram-error">Latest Instagram posts are temporarily unavailable. <a class="text-link" href="https://www.instagram.com/lborooutwoodscc" target="_blank" rel="noreferrer">View Instagram</a></p>';
        if (prevButton) prevButton.hidden = true;
        if (nextButton) nextButton.hidden = true;
      });
  }
}

const galleryItems = Array.from(document.querySelectorAll('.gallery-thumb'));
const lightbox = document.querySelector('[data-lightbox]');
if (galleryItems.length && lightbox) {
  const image = lightbox.querySelector('[data-lightbox-image]');
  const counter = lightbox.querySelector('[data-lightbox-counter]');
  const closeButton = lightbox.querySelector('.lightbox-close');
  const prevButton = lightbox.querySelector('.lightbox-prev');
  const nextButton = lightbox.querySelector('.lightbox-next');
  let currentIndex = 0;

  const showImage = (index) => {
    currentIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentIndex];
    image.src = item.dataset.full;
    image.alt = item.dataset.alt || '';
    counter.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
  };

  const openLightbox = (index) => {
    showImage(index);
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    galleryItems[currentIndex].focus();
  };

  galleryItems.forEach((item, index) => item.addEventListener('click', () => openLightbox(index)));
  prevButton.addEventListener('click', () => showImage(currentIndex - 1));
  nextButton.addEventListener('click', () => showImage(currentIndex + 1));
  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (event.key === 'ArrowRight') showImage(currentIndex + 1);
  });
}
