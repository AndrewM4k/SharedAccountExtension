chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'fillCredentials') {
    document.querySelector('input[name="login"]').value = request.login;
    document.querySelector('input[name="password"]').value = request.password;
  }
});
