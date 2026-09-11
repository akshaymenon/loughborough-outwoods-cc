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
      `Phone / WhatsApp: ${data.get('phone') || ''}`,
      `Email: ${data.get('email') || ''}`,
      `Role: ${data.get('role') || ''}`,
      `Standard: ${data.get('standard') || ''}`,
      `Saturday availability: ${data.get('availability') || ''}`,
      `Student / staff: ${data.get('student') || ''}`,
      `How they heard about us: ${data.get('source') || ''}`,
      '',
      `Extra info: ${data.get('message') || ''}`
    ].join('\n');
    const subject = encodeURIComponent('2027 player enquiry — LOCC');
    window.location.href = `mailto:lborooutwoodscc@gmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  });
}