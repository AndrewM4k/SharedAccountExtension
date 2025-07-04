// chrome.omnibox.onInputEntered.addListener(() => {
//   chrome.tabs.create({ url: chrome.runtime.getURL('src/admin/admin.html') });
// });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_COPART_CREDS') {
    // Запрос к вашему бэкенду
    fetch('http://localhost:5000/api/sharedaccount')
      .then((res) => res.json())
      .then((creds) => sendResponse(creds));
    return true;
  }

  if (msg.type === 'RECORD_ACTION') {
    // Отправка действия на сервер
    fetch('http://localhost:5000/api/action/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getCookie('token'),
      },
      body: JSON.stringify(msg),
    });
  }
});

export function getCookie(name) {
  //const matches = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1")}=([^;]*)`));
  const matches = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`
    )
  );
  return matches ? decodeURIComponent(matches[1]) : '';
}
