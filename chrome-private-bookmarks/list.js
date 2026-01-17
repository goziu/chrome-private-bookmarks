const ITEMS_PER_PAGE = 100;
const PASSWORD = 'mb4649!'; // 固定パスワード
let allBookmarks = [];
let filteredBookmarks = [];
let currentPage = 1;

// DOM要素の取得
const passwordScreen = document.getElementById('passwordScreen');
const mainContent = document.getElementById('mainContent');
const passwordInput = document.getElementById('passwordInput');
const passwordError = document.getElementById('passwordError');
const passwordSubmit = document.getElementById('passwordSubmit');
const searchInput = document.getElementById('searchInput');
const bookmarkList = document.getElementById('bookmarkList');
const pagination = document.getElementById('pagination');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');

// ブックマークを読み込む
function loadBookmarks() {
  chrome.storage.local.get(['bookmarks'], (result) => {
    allBookmarks = result.bookmarks || [];
    filteredBookmarks = [...allBookmarks];
    currentPage = 1;
    renderBookmarks();
    renderPagination();
  });
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
    return `
      <div class="bookmark-item">
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
  let csv = 'タイトル,URL,日時\n';
  
  // データ行
  filteredBookmarks.forEach(bookmark => {
    const title = escapeCsv(bookmark.title || '');
    const url = escapeCsv(bookmark.url || '');
    const date = new Date(bookmark.date).toLocaleString('ja-JP');
    csv += `${title},${url},${date}\n`;
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
    chrome.storage.local.set({ bookmarks: allBookmarks }, () => {
      // 現在のページにアイテムがなくなった場合、前のページに移動
      const totalPages = Math.ceil(filteredBookmarks.length / ITEMS_PER_PAGE);
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
      
      renderBookmarks();
      renderPagination();
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
    chrome.storage.local.set({ bookmarks: [] }, () => {
      allBookmarks = [];
      filteredBookmarks = [];
      currentPage = 1;
      searchInput.value = '';
      renderBookmarks();
      renderPagination();
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

// パスワード認証
function checkPassword() {
  const inputPassword = passwordInput.value;
  
  if (inputPassword === PASSWORD) {
    // 認証成功
    sessionStorage.setItem('bookmarkListAuthenticated', 'true');
    showMainContent();
  } else {
    // 認証失敗
    passwordError.textContent = 'パスワードが正しくありません';
    passwordInput.value = '';
    passwordInput.focus();
  }
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
function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem('bookmarkListAuthenticated') === 'true';
  
  if (isAuthenticated) {
    showMainContent();
  } else {
    passwordScreen.style.display = 'block';
    mainContent.style.display = 'none';
    passwordInput.focus();
  }
}

// 初期化
checkAuthentication();

