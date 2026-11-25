// Login with fetch() (Exercise 1, 3, 10). Email and password are sent as JSON in the body
// of a POST request over HTTPS, never in the URL. The server answers with an HttpOnly cookie.
const form = document.getElementById('login-form');
const error = document.getElementById('login-error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: form.email.value, password: form.password.value }),
  });

  if (response.ok) {
    window.location.href = '/dashboard.html';
    return;
  }
  form.password.value = '';
  error.textContent =
    response.status === 429 ? 'For mange forsøg. Prøv igen senere.' : 'Forkert email eller password.';
  error.hidden = false;
});
