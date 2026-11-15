// Dashboard logic with fetch() (Exercise 1, 3). Login is built in phase 2.
// Until then the form is stopped here, so the browser never sends the fields
// as a GET request (which would put the password in the URL and in the server logs).
const form = document.getElementById('login-form');
const error = document.getElementById('login-error');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  error.textContent = 'Login er ikke bygget endnu (fase 2).';
  error.hidden = false;
});
