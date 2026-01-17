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
      const exists = bookmarks.some(b => b.url === bookmark.url);
      
      if (!exists) {
        // 新しいブックマークを先頭に追加
        bookmarks.unshift(bookmark);
        
        // ストレージに保存
        chrome.storage.local.set({ bookmarks: bookmarks }, () => {
          console.log('ブックマークを保存しました');
        });
      }
    });
  }
});

