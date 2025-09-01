if (
  window.location.href.includes("copart.com/ru/login") ||
  window.location.href.includes("copart.com/en/login")
) {
  console.log("script started");
  chrome.runtime.sendMessage({ type: "GET_COPART_CREDS" }, (creds) => {
    document.querySelector("#username").value = creds.login;
    document.querySelector("#password").value = creds.password;
    document.querySelector("#sign_in").click();
  });
}
// Отслеживание покупок
document.addEventListener("click", (e) => {
  if (e.target.closest(".bid-btn")) {
    const lot = document.querySelector(".lot-number").innerText;
    chrome.runtime.sendMessage({
      type: "RECORD_ACTION",
      actionType: "BID",
      lotNumber: lot,
      details: { price: document.querySelector(".bid-price").value },
    });
  }
});

// chrome.runtime.onMessage.addListener((request) => {
//   if (request.action === 'fillCredentials') {
//     document.querySelector('input[name="login"]').value = request.login;
//     document.querySelector('input[name="password"]').value = request.password;
//   }
// });

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FILL_COPART_CREDS") {
    const usernameInput = document.querySelector("#username");
    const passwordInput = document.querySelector("#password");

    if (usernameInput && passwordInput) {
      usernameInput.value = message.login;
      passwordInput.value = message.password;
      document.querySelector("#sign_in").click();
    }
  }
});
