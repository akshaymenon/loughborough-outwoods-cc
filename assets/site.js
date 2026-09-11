const menuButton = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');
if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

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