// バックグラウンドスクリプト（Service Worker）
// コンテキストメニュー（右クリックメニュー）とコマンドの処理

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openBookmarkList',
    title: 'ブックマークリストを開く',
    contexts: ['action']
  });
});

// コンテキストメニューのクリック処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openBookmarkList') {
    chrome.tabs.create({ url: chrome.runtime.getURL('list.html') });
  }
});

// コマンド（ショートカットキー）の処理
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-bookmark-list') {
    chrome.tabs.create({ url: chrome.runtime.getURL('list.html') });
  }
});

