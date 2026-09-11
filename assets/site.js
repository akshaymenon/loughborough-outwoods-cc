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

const joinForm = document.querySelector('#join-form');
if (joinForm) {
  joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(joinForm);
    const body = [
      `Name: ${data.get('name') || ''}`,
      `Contact: ${data.get('contact') || ''}`,
      `How they heard about us: ${data.get('source') || ''}`,
      '',
      `${data.get('message') || ''}`
    ].join('\n');
    const subject = encodeURIComponent('Player enquiry — Loughborough Outwoods CC');
    window.location.href = `mailto:lborooutwoodscc@gmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  });
}