const ITEMS_PER_PAGE = 100;
let allBookmarks = [];
let filteredBookmarks = [];
let currentPage = 1;

// DOM要素の取得
const passwordSetupScreen = document.getElementById('passwordSetupScreen');
const passwordScreen = document.getElementById('passwordScreen');
const mainContent = document.getElementById('mainContent');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const passwordSubmit = document.getElementById('passwordSubmit');
const newPasswordInput = document.getElementById('newPasswordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const setupPasswordError = document.getElementById('setupPasswordError');
const setupPasswordBtn = document.getElementById('setupPasswordBtn');
const skipPasswordBtn = document.getElementById('skipPasswordBtn');
const searchInput = document.getElementById('searchInput');
const bookmarkList = document.getElementById('bookmarkList');
const pagination = document.getElementById('pagination');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const importMessage = document.getElementById('importMessage');

// 重複を削除する関数（同じURLのデータが複数ある場合、最新のものを残す）
function removeDuplicates(bookmarks) {
  const urlMap = new Map();
  let hasDuplicates = false;

  // 各ブックマークを処理
  for (const bookmark of bookmarks) {
    const url = bookmark.url;
    
    if (!urlMap.has(url)) {
      // 初めて見つかったURL
      urlMap.set(url, bookmark);
    } else {
      // 重複が見つかった
      hasDuplicates = true;
      const existing = urlMap.get(url);
      const existingDate = new Date(existing.date);
      const newDate = new Date(bookmark.date);
      
      // より新しい日時のものを残す（日時が同じ場合は既存のものを残す）
      if (newDate > existingDate) {
        urlMap.set(url, bookmark);
      }
      // 保護状態を考慮（どちらかが保護されている場合は保護されている方を優先）
      else if (newDate.getTime() === existingDate.getTime()) {
        if (bookmark.protected && !existing.protected) {
          urlMap.set(url, bookmark);
        } else if (!bookmark.protected && existing.protected) {
          // 既存の保護されたものを残す
        } else {
          // 両方保護されている、または両方保護されていない場合は既存のものを残す
        }
      }
    }
  }

  if (hasDuplicates) {
    // 重複があった場合、Mapから配列に変換
    return Array.from(urlMap.values());
  }
  
  return bookmarks;
}

// ブックマークを読み込む
function loadBookmarks() {
  chrome.storage.sync.get(['bookmarks'], (result) => {
    let bookmarks = result.bookmarks || [];
    
    // 重複を削除
    const originalCount = bookmarks.length;
    bookmarks = removeDuplicates(bookmarks);
    const removedCount = originalCount - bookmarks.length;
    
    // 重複が削除された場合、ストレージに保存
    if (removedCount > 0) {
      chrome.storage.sync.set({ bookmarks: bookmarks }, () => {
        console.log(`${removedCount}件の重複ブックマークを削除しました`);
      });
    }
    
    allBookmarks = bookmarks;
    // 保護されたブックマークを先に、その後登録順にソート
    allBookmarks.sort((a, b) => {
      const aProtected = a.protected || false;
      const bProtected = b.protected || false;
      if (aProtected && !bProtected) return -1;
      if (!aProtected && bProtected) return 1;
      // 両方保護されている、または両方保護されていない場合は登録順（日付の降順）
      return new Date(b.date) - new Date(a.date);
    });
    filteredBookmarks = [...allBookmarks];
    currentPage = 1;
    renderBookmarks();
    renderPagination();
    updateStorageUsage();
    // 容量チェックと自動削除
    checkAndCleanupStorage();
  });
}

// ストレージ使用量を計算して表示
function updateStorageUsage() {
  const dataString = JSON.stringify(allBookmarks);
  const sizeInBytes = new Blob([dataString]).size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  const maxSizeKB = 100;
  const usagePercent = ((sizeInKB / maxSizeKB) * 100).toFixed(1);
  
  const storageInfo = document.getElementById('storageInfo');
  if (storageInfo) {
    storageInfo.textContent = `使用容量: ${sizeInKB}KB / ${maxSizeKB}KB (${usagePercent}%)`;
    
    // 容量が80%を超えたら警告色に
    if (sizeInKB > maxSizeKB * 0.8) {
      storageInfo.className = 'storage-info warning';
    } else {
      storageInfo.className = 'storage-info';
    }
  }
}

// 容量が100KBを超えた場合、保護されていない古いブックマークから削除
function checkAndCleanupStorage() {
  const dataString = JSON.stringify(allBookmarks);
  const sizeInBytes = new Blob([dataString]).size;
  const sizeInKB = sizeInBytes / 1024;
  const maxSizeKB = 100;

  if (sizeInKB > maxSizeKB) {
    // 保護されていないブックマークを古い順にソート
    const unprotectedBookmarks = allBookmarks
      .filter(b => !(b.protected || false))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // 古い順

    let removedCount = 0;
    let currentBookmarks = [...allBookmarks];

    // 保護されていない古いブックマークから削除
    for (const bookmark of unprotectedBookmarks) {
      // 現在のサイズを計算
      const currentSize = new Blob([JSON.stringify(currentBookmarks)]).size / 1024;
      if (currentSize <= maxSizeKB) break;

      // このブックマークを削除
      const index = currentBookmarks.findIndex(b => b.url === bookmark.url);
      if (index !== -1) {
        currentBookmarks.splice(index, 1);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      // ストレージに保存
      chrome.storage.sync.set({ bookmarks: currentBookmarks }, () => {
        allBookmarks = currentBookmarks;
        // 保護されたブックマークを先に表示するように再ソート
        allBookmarks.sort((a, b) => {
          const aProtected = a.protected || false;
          const bProtected = b.protected || false;
          if (aProtected && !bProtected) return -1;
          if (!aProtected && bProtected) return 1;
          return new Date(b.date) - new Date(a.date);
        });
        filteredBookmarks = [...allBookmarks];
        currentPage = 1;
        renderBookmarks();
        renderPagination();
        updateStorageUsage();
        alert(`${removedCount}件の保護されていない古いブックマークを自動削除しました（容量制限のため）`);
      });
    }
  }
}

// 検索機能
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  
  if (query === '') {
    filteredBookmarks = [...allBookmarks];
  } else {
    filteredBookmarks = allBookmarks.filter(bookmark => {
      const title = (bookmark.title || '').toLowerCase();
      const url = (bookmark.url || '').toLowerCase();
      return title.includes(query) || url.includes(query);
    });
    // 検索結果も保護されたものを先に表示
    filteredBookmarks.sort((a, b) => {
      const aProtected = a.protected || false;
      const bProtected = b.protected || false;
      if (aProtected && !bProtected) return -1;
      if (!aProtected && bProtected) return 1;
      return new Date(b.date) - new Date(a.date);
    });
  }
  
  currentPage = 1;
  renderBookmarks();
  renderPagination();
});

// ブックマークリストを表示
function renderBookmarks() {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageBookmarks = filteredBookmarks.slice(startIndex, endIndex);

  if (pageBookmarks.length === 0) {
    bookmarkList.innerHTML = '<p class="no-results">ブックマークがありません</p>';
    return;
  }

  bookmarkList.innerHTML = pageBookmarks.map((bookmark, index) => {
    const date = new Date(bookmark.date);
    const dateStr = date.toLocaleString('ja-JP');
    // URLをbase64エンコードして安全に使用
    const encodedUrl = btoa(unescape(encodeURIComponent(bookmark.url)));
    const isProtected = bookmark.protected || false;
    const starIcon = isProtected ? '★' : '☆';
    return `
      <div class="bookmark-item">
        <button class="btn-protect ${isProtected ? 'protected' : ''}" data-url="${encodedUrl}" title="${isProtected ? '保護解除' : '保護'}">${starIcon}</button>
        <a href="${bookmark.url}" target="_blank" class="bookmark-link">
          ${escapeHtml(bookmark.title || bookmark.url)}
        </a>
        <div class="bookmark-actions">
          <span class="bookmark-date">${dateStr}</span>
          <button class="btn-delete" data-url="${encodedUrl}" title="削除">×</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 削除ボタンにイベントリスナーを追加
  bookmarkList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const encodedUrl = btn.getAttribute('data-url');
      const url = decodeURIComponent(escape(atob(encodedUrl)));
      deleteBookmark(url);
    });
  });

  // 保護ボタンにイベントリスナーを追加
  bookmarkList.querySelectorAll('.btn-protect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const encodedUrl = btn.getAttribute('data-url');
      const url = decodeURIComponent(escape(atob(encodedUrl)));
      toggleProtect(url);
    });
  });
}

// ページネーションを表示
function renderPagination() {
  const totalPages = Math.ceil(filteredBookmarks.length / ITEMS_PER_PAGE);
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let paginationHTML = '<div class="pagination-controls">';
  
  // 前へボタン
  if (currentPage > 1) {
    paginationHTML += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">前へ</button>`;
  }
  
  // ページ番号
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="page-btn active">${i}</button>`;
    } else {
      paginationHTML += `<button class="page-btn" onclick="goToPage(${i})">${i}</button>`;
    }
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }
    paginationHTML += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }
  
  // 次へボタン
  if (currentPage < totalPages) {
    paginationHTML += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">次へ</button>`;
  }
  
  paginationHTML += '</div>';
  paginationHTML += `<div class="page-info">${filteredBookmarks.length}件中 ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredBookmarks.length)}件を表示</div>`;
  
  pagination.innerHTML = paginationHTML;
}

// ページ遷移
function goToPage(page) {
  currentPage = page;
  renderBookmarks();
  renderPagination();
  window.scrollTo(0, 0);
}

// CSVダウンロード
downloadBtn.addEventListener('click', () => {
  if (filteredBookmarks.length === 0) {
    alert('ダウンロードするブックマークがありません');
    return;
  }

  // CSVヘッダー
  let csv = 'タイトル,URL,日時,保護\n';
  
  // データ行
  filteredBookmarks.forEach(bookmark => {
    const title = escapeCsv(bookmark.title || '');
    const url = escapeCsv(bookmark.url || '');
    const date = new Date(bookmark.date).toLocaleString('ja-JP');
    const protected = (bookmark.protected || false) ? '1' : '0';
    csv += `${title},${url},${date},${protected}\n`;
  });

  // Blobを作成してダウンロード
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookmarks_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

// 保護機能のトグル
function toggleProtect(url) {
  const bookmark = allBookmarks.find(b => b.url === url);
  if (!bookmark) return;

  // 保護状態を切り替え
  bookmark.protected = !(bookmark.protected || false);

  // 保護されたブックマークを先に表示するように再ソート
  allBookmarks.sort((a, b) => {
    const aProtected = a.protected || false;
    const bProtected = b.protected || false;
    if (aProtected && !bProtected) return -1;
    if (!aProtected && bProtected) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  // 検索結果も再ソート
  if (searchInput.value.trim() === '') {
    filteredBookmarks = [...allBookmarks];
  } else {
    filteredBookmarks = allBookmarks.filter(bookmark => {
      const title = (bookmark.title || '').toLowerCase();
      const url = (bookmark.url || '').toLowerCase();
      const query = searchInput.value.toLowerCase().trim();
      return title.includes(query) || url.includes(query);
    });
    // 検索結果も保護されたものを先に表示
    filteredBookmarks.sort((a, b) => {
      const aProtected = a.protected || false;
      const bProtected = b.protected || false;
      if (aProtected && !bProtected) return -1;
      if (!aProtected && bProtected) return 1;
      return new Date(b.date) - new Date(a.date);
    });
  }

  // ストレージに保存
  chrome.storage.sync.set({ bookmarks: allBookmarks }, () => {
    currentPage = 1;
    renderBookmarks();
    renderPagination();
    updateStorageUsage();
    checkAndCleanupStorage();
  });
}

// 個別削除機能
function deleteBookmark(url) {
  const bookmark = allBookmarks.find(b => b.url === url);
  if (!bookmark) return;
  
  const title = bookmark.title || url;
  const confirmMessage = `「${title.length > 50 ? title.substring(0, 50) + '...' : title}」を削除しますか？`;
  
  if (confirm(confirmMessage)) {
    // すべてのブックマークから該当するURLを削除
    allBookmarks = allBookmarks.filter(b => b.url !== url);
    filteredBookmarks = filteredBookmarks.filter(b => b.url !== url);
    
    // ストレージに保存
    chrome.storage.sync.set({ bookmarks: allBookmarks }, () => {
      // 現在のページにアイテムがなくなった場合、前のページに移動
      const totalPages = Math.ceil(filteredBookmarks.length / ITEMS_PER_PAGE);
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
      
      renderBookmarks();
      renderPagination();
      updateStorageUsage();
      checkAndCleanupStorage();
    });
  }
}

// クリア機能
clearBtn.addEventListener('click', () => {
  if (allBookmarks.length === 0) {
    alert('削除するブックマークがありません');
    return;
  }

  if (confirm('すべてのブックマークを削除しますか？この操作は取り消せません。')) {
    chrome.storage.sync.set({ bookmarks: [] }, () => {
      allBookmarks = [];
      filteredBookmarks = [];
      currentPage = 1;
      searchInput.value = '';
      renderBookmarks();
      renderPagination();
      updateStorageUsage();
      alert('すべてのブックマークを削除しました');
    });
  }
});

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CSVエスケープ
function escapeCsv(text) {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// CSVパース（シンプルな実装）
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    throw new Error('CSVファイルの形式が正しくありません');
  }

  // ヘッダー行をスキップ
  const dataLines = lines.slice(1).filter(line => line.trim() !== '');
  const bookmarks = [];

  for (const line of dataLines) {
    // シンプルなCSVパース（カンマ区切り、ダブルクォート対応）
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート
          currentField += '"';
          i++; // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // フィールドの終了
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField); // 最後のフィールド

    if (fields.length >= 3) {
      const title = fields[0].trim();
      const url = fields[1].trim();
      const dateStr = fields[2].trim();
      const protectedStr = fields.length >= 4 ? fields[3].trim() : '0';

      if (url) {
        // 日付のパース（複数の形式に対応）
        let date;
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            // 日付が無効な場合、現在の日時を使用
            date = new Date();
          }
        } catch (e) {
          date = new Date();
        }

        // 保護状態のパース（'1'または'true'で保護、それ以外は非保護）
        const isProtected = protectedStr === '1' || protectedStr.toLowerCase() === 'true';

        bookmarks.push({
          title: title || url,
          url: url,
          date: date.toISOString(),
          protected: isProtected
        });
      }
    }
  }

  return bookmarks;
}

// CSVインポート機能
importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.csv')) {
    importMessage.textContent = 'エラー: CSVファイルを選択してください';
    importMessage.className = 'import-message error';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const csvText = event.target.result;
      const importedBookmarks = parseCSV(csvText);

      if (importedBookmarks.length === 0) {
        importMessage.textContent = 'エラー: 有効なブックマークが見つかりませんでした';
        importMessage.className = 'import-message error';
        return;
      }

      // 既存のブックマークとマージ（重複チェック）
      const existingUrls = new Set(allBookmarks.map(b => b.url));
      const newBookmarks = importedBookmarks.filter(b => !existingUrls.has(b.url));
      const duplicateCount = importedBookmarks.length - newBookmarks.length;

      // 既存のブックマークと新しいブックマークをマージ
      const mergedBookmarks = [...allBookmarks, ...newBookmarks];

      // 保護されたブックマークを先に表示するように再ソート
      mergedBookmarks.sort((a, b) => {
        const aProtected = a.protected || false;
        const bProtected = b.protected || false;
        if (aProtected && !bProtected) return -1;
        if (!aProtected && bProtected) return 1;
        return new Date(b.date) - new Date(a.date);
      });

      // ストレージに保存
      chrome.storage.sync.set({ bookmarks: mergedBookmarks }, () => {
        allBookmarks = mergedBookmarks;
        filteredBookmarks = [...allBookmarks];
        currentPage = 1;
        searchInput.value = '';
        renderBookmarks();
        renderPagination();
        updateStorageUsage();
        checkAndCleanupStorage();

        // メッセージを表示
        let message = `${newBookmarks.length}件のブックマークをインポートしました`;
        if (duplicateCount > 0) {
          message += `（${duplicateCount}件は重複のためスキップされました）`;
        }
        importMessage.textContent = message;
        importMessage.className = 'import-message success';

        // 3秒後にメッセージをクリア
        setTimeout(() => {
          importMessage.textContent = '';
          importMessage.className = 'import-message';
        }, 3000);
      });
    } catch (error) {
      importMessage.textContent = `エラー: ${error.message}`;
      importMessage.className = 'import-message error';
    }

    // ファイル入力をリセット
    importFileInput.value = '';
  };

  reader.onerror = () => {
    importMessage.textContent = 'エラー: ファイルの読み込みに失敗しました';
    importMessage.className = 'import-message error';
  };

  // UTF-8 BOMを考慮して読み込む
  reader.readAsText(file, 'UTF-8');
});

// パスワードをハッシュ化
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// パスワード認証
async function checkPassword() {
  const inputPassword = passwordInput.value;
  
  // パスワード設定を確認
  chrome.storage.sync.get(['passwordHash', 'usePassword'], async (result) => {
    const usePassword = result.usePassword !== false; // デフォルトはtrue（後方互換性のため）
    
    if (!usePassword) {
      // パスワードを使用しない場合
      sessionStorage.setItem('bookmarkListAuthenticated', 'true');
      showMainContent();
      return;
    }
    
    const storedHash = result.passwordHash;
    
    if (!storedHash) {
      // パスワードが設定されていない場合（初回起動）
      showPasswordSetup();
      return;
    }
    
    // 入力パスワードをハッシュ化して比較
    const inputHash = await hashPassword(inputPassword);
    
    if (inputHash === storedHash) {
      // 認証成功
      sessionStorage.setItem('bookmarkListAuthenticated', 'true');
      showMainContent();
    } else {
      // 認証失敗
      passwordError.textContent = 'パスワードが正しくありません';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
}

// パスワード設定画面を表示
function showPasswordSetup() {
  passwordScreen.style.display = 'none';
  passwordSetupScreen.style.display = 'flex';
  mainContent.style.display = 'none';
  newPasswordInput.focus();
}

// パスワードを設定
async function setupPassword() {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (newPassword !== confirmPassword) {
    setupPasswordError.textContent = 'パスワードが一致しません';
    return;
  }
  
  if (newPassword.length > 0 && newPassword.length < 4) {
    setupPasswordError.textContent = 'パスワードは4文字以上にしてください';
    return;
  }
  
  if (newPassword.length > 0) {
    // パスワードをハッシュ化して保存
    const passwordHash = await hashPassword(newPassword);
    chrome.storage.sync.set({ passwordHash: passwordHash, usePassword: true }, () => {
      sessionStorage.setItem('bookmarkListAuthenticated', 'true');
      showMainContent();
    });
  } else {
    // パスワードを利用しない
    chrome.storage.sync.set({ usePassword: false }, () => {
      sessionStorage.setItem('bookmarkListAuthenticated', 'true');
      showMainContent();
    });
  }
}

// パスワードをスキップ
function skipPassword() {
  chrome.storage.sync.set({ usePassword: false }, () => {
    sessionStorage.setItem('bookmarkListAuthenticated', 'true');
    showMainContent();
  });
}

// メインコンテンツを表示
function showMainContent() {
  passwordScreen.style.display = 'none';
  mainContent.style.display = 'block';
  loadBookmarks();
}

// パスワード入力でEnterキーを押したとき
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    checkPassword();
  }
});

// パスワード送信ボタン
passwordSubmit.addEventListener('click', checkPassword);

// 認証状態をチェック
async function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem('bookmarkListAuthenticated') === 'true';
  
  if (isAuthenticated) {
    showMainContent();
  } else {
    // パスワード設定を確認
    chrome.storage.sync.get(['passwordHash', 'usePassword'], async (result) => {
      const usePassword = result.usePassword !== false; // デフォルトはtrue（後方互換性のため）
      const hasPassword = !!result.passwordHash;
      
      // 後方互換性: 既存の固定パスワードを自動移行
      if (!hasPassword && usePassword) {
        // パスワードが設定されていない場合（初回起動）
        showPasswordSetup();
      } else if (!usePassword) {
        // パスワードを使用しない設定の場合
        sessionStorage.setItem('bookmarkListAuthenticated', 'true');
        showMainContent();
      } else {
        // パスワード入力画面を表示
        passwordScreen.style.display = 'flex';
        passwordSetupScreen.style.display = 'none';
        mainContent.style.display = 'none';
        passwordInput.focus();
      }
    });
  }
}

// パスワード設定ボタン
setupPasswordBtn.addEventListener('click', async () => {
  await setupPassword();
});

// パスワードスキップボタン
skipPasswordBtn.addEventListener('click', skipPassword);

// パスワード設定画面でEnterキーを押したとき
newPasswordInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    await setupPassword();
  }
});

confirmPasswordInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    await setupPassword();
  }
});

// ストレージ変更を監視（同期時に自動的に重複をチェック）
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.bookmarks) {
    // ブックマークデータが変更された場合（同期など）、重複をチェック
    const newBookmarks = changes.bookmarks.newValue || [];
    const deduplicatedBookmarks = removeDuplicates(newBookmarks);
    
    // 重複が削除された場合、ストレージに保存
    if (deduplicatedBookmarks.length < newBookmarks.length) {
      chrome.storage.sync.set({ bookmarks: deduplicatedBookmarks }, () => {
        console.log('同期時に重複ブックマークを削除しました');
        // データを再読み込み
        loadBookmarks();
      });
    } else {
      // 重複がない場合でも、データを再読み込み（表示を更新）
      loadBookmarks();
    }
  }
});

// 初期化
checkAuthentication();

