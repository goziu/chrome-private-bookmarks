// ポップアップが開かれた時点でCtrlキーが押されているかチェック
// 注意: ポップアップが開いた瞬間にCtrlキーの状態を取得するのは難しいため、
// キーボードイベントを監視して、Ctrlキーが押されたらリストを開く

let ctrlKeyPressed = false;
let bookmarkAdded = false;

const IMPORTANCE = {
  GOLD: 'gold',
  SILVER: 'silver'
};

function getImportance(bookmark) {
  if (bookmark.importance === IMPORTANCE.GOLD || bookmark.importance === IMPORTANCE.SILVER) {
    return bookmark.importance;
  }
  return bookmark.protected ? IMPORTANCE.GOLD : 'none';
}

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
      chrome.storage.local.get(['bookmarks'], (result) => {
        const bookmarks = result.bookmarks || [];
        
        // 重複チェック（同じURLが既に存在するか）
        const existingIndex = bookmarks.findIndex(b => b.url === bookmark.url);
        
        if (existingIndex === -1) {
          // 新しいブックマークを先頭に追加
          bookmarks.unshift(bookmark);
          
          // ストレージに保存
          chrome.storage.local.set({ bookmarks: bookmarks }, () => {
            console.log('ブックマークを保存しました');
            // 成功メッセージを表示
            const successMessage = document.getElementById('successMessage');
            const duplicateMessage = document.getElementById('duplicateMessage');
            if (successMessage) successMessage.style.display = 'block';
            if (duplicateMessage) duplicateMessage.style.display = 'none';
          });
        } else {
          // 重複している場合
          const existingBookmark = bookmarks[existingIndex];
          
          // 日時を更新
          existingBookmark.date = bookmark.date;
          // タイトルも更新（ページタイトルが変更されている可能性がある）
          existingBookmark.title = bookmark.title;
          
          // 既存のブックマークを先頭に移動
          bookmarks.splice(existingIndex, 1);
          bookmarks.unshift(existingBookmark);
          
          // 保護されたブックマークを先に表示するように再ソート
          bookmarks.sort((a, b) => {
            const aGold = getImportance(a) === IMPORTANCE.GOLD;
            const bGold = getImportance(b) === IMPORTANCE.GOLD;
            if (aGold && !bGold) return -1;
            if (!aGold && bGold) return 1;
            return new Date(b.date) - new Date(a.date);
          });
          
          // ストレージに保存
          chrome.storage.local.set({ bookmarks: bookmarks }, () => {
            console.log('ブックマークを更新しました');
            // 重複メッセージを表示
            const successMessage = document.getElementById('successMessage');
            const duplicateMessage = document.getElementById('duplicateMessage');
            if (successMessage) successMessage.style.display = 'none';
            if (duplicateMessage) duplicateMessage.style.display = 'block';
          });
        }
      });
    }
  });
}

