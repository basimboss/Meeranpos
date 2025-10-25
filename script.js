// script.js — login logic
document.addEventListener('DOMContentLoaded', function() {
  const loginBtn = document.getElementById('loginBtn');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('errorMsg');

  loginBtn.addEventListener('click', function() {
    const password = passwordInput.value;
    if (password === 'm2*g%Da1%k^HF') {
      // correct password
      window.location.href = 'home.html';
    } else {
      // incorrect
      errorMsg.textContent = 'Incorrect password! Only owner can access.';
      passwordInput.value = '';
    }
  });

  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') loginBtn.click();
  });
});

