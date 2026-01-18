// バックグラウンドスクリプト（Service Worker）
// コンテキストメニュー（右クリックメニュー）とコマンドの処理

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openBookmarkList',
    title: 'ブックマークリストを開く',
    contexts: ['action']
  });
  
  chrome.contextMenus.create({
    id: 'changePassword',
    title: 'パスワードを設定（変更）する',
    contexts: ['action']
  });
  
  chrome.contextMenus.create({
    id: 'syncData',
    title: '同期する',
    contexts: ['action']
  });
});

// コンテキストメニューのクリック処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openBookmarkList') {
    chrome.tabs.create({ url: chrome.runtime.getURL('list.html') });
  } else if (info.menuItemId === 'changePassword') {
    chrome.tabs.create({ url: chrome.runtime.getURL('list.html?changePassword=true') });
  } else if (info.menuItemId === 'syncData') {
    // 同期処理を実行
    syncBookmarkData();
  }
});

// ブックマークデータを同期する関数
function syncBookmarkData() {
  // 最新データを取得（これによりChromeがサーバーから最新データを取得）
  chrome.storage.sync.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error('同期エラー:', chrome.runtime.lastError);
      return;
    }
    
    // 取得したデータを再度保存することで、同期を確実にトリガー
    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        console.error('保存エラー:', chrome.runtime.lastError);
        return;
      }
      
      // 通知を表示
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '同期完了',
        message: 'ブックマークデータの同期が完了しました。'
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.log('通知表示エラー（無視可能）:', chrome.runtime.lastError);
          // 通知が表示できない場合でも、同期は完了している
          return;
        }
        
        // 3秒後に通知を閉じる
        if (notificationId) {
          setTimeout(() => {
            chrome.notifications.clear(notificationId);
          }, 3000);
        }
      });
    });
  });
}

// コマンド（ショートカットキー）の処理
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-bookmark-list') {
    chrome.tabs.create({ url: chrome.runtime.getURL('list.html') });
  }
});

