// ポップアップが開かれた時点でCtrlキーが押されているかチェック
// 注意: ポップアップが開いた瞬間にCtrlキーの状態を取得するのは難しいため、
// キーボードイベントを監視して、Ctrlキーが押されたらリストを開く

let ctrlKeyPressed = false;
let bookmarkAdded = false;

// キーボードイベントを監視
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    ctrlKeyPressed = true;
    // Ctrlキーが押されたら、ブックマークを追加せずにリストを開く
    if (!bookmarkAdded) {
      chrome.tabs.create({ url: chrome.runtime.getURL('list.html') });
      window.close();
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (!e.ctrlKey && !e.metaKey) {
    ctrlKeyPressed = false;
  }
});

// ページ読み込み時に、URLパラメータでCtrl+クリックかどうかを判定
// ただし、Chrome拡張機能のポップアップではURLパラメータを渡せないため、
// 別の方法を使用

// マウスイベントでCtrlキーの状態をチェック
document.addEventListener('mousedown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    ctrlKeyPressed = true;
  }
});

// ポップアップが開いた直後に、Ctrlキーが押されているかチェック
// これは難しいため、代わりにキーボードイベントを監視する方法を使用

// 通常のクリックの場合、ブックマークを追加
window.addEventListener('load', () => {
  // 少し遅延させて、キーイベントをキャッチできるようにする
  setTimeout(() => {
    // Ctrlキーが押されていない場合のみ、ブックマークを追加
    if (!ctrlKeyPressed) {
      addBookmark();
    }
  }, 100);
});

// ブックマークを追加する関数
function addBookmark() {
  if (bookmarkAdded) return;
  bookmarkAdded = true;
  
  // 現在のタブの情報を取得してブックマークに追加
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      const bookmark = {
        title: tab.title || tab.url,
        url: tab.url,
        date: new Date().toISOString()
      };

      // ストレージから既存のブックマークを取得
      chrome.storage.sync.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || [];
        
        // 重複チェック（同じURLが既に存在するか）
        const exists = bookmarks.some(b => b.url === bookmark.url);
        
        if (!exists) {
          // 新しいブックマークを先頭に追加
          bookmarks.unshift(bookmark);
          
          // ストレージに保存
          chrome.storage.sync.set({ bookmarks: bookmarks }, () => {
            console.log('ブックマークを保存しました');
          });
        }
      });
    }
  });
}

