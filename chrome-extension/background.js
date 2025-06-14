chrome.omnibox.onInputEntered.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/admin/admin.html') });
});
