// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let isEditMode = false;
let activeColId = null;
let activeItemId = null;
let columnSortable = null;
let saveDebounceTimer = null;
let isLoading = false;

// =============================================
// 1. PROSES PEMUATAN + BOOKMARK PARAMS (FITUR BARU)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess();
    setInterval(updateAllCountdowns, 1000);
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // FITUR BARU: Cek apakah dibuka dari bookmarklet
    setTimeout(handleBookmarkParams, 800); // tunggu render selesai
});

function startLoadingProcess() {
    isLoading = true;
    const localData = localStorage.getItem('airdrop_terminal_v7');
    if (localData) renderAllData(JSON.parse(localData));
    else renderAllData(null);

    db.ref('dashboard_data').on('value', (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData) {
            localStorage.setItem('airdrop_terminal_v7', JSON.stringify(cloudData));
            renderAllData(cloudData);
        }
        isLoading = false;
    });
}

// =============================================
// FITUR BARU: HANDLE BOOKMARKLET PARAMS
// =============================================
function handleBookmarkParams() {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const url = params.get('url');

    if (!title || !url) return;

    // Cari atau buat kolom Uncategorized
    let uncatCol = Array.from(document.querySelectorAll('.column')).find(col => 
        col.querySelector('.col-title').innerText === 'Uncategorized'
    );

    if (!uncatCol) {
        const newId = 'uncat-' + Date.now();
        createColumn(newId, 'Uncategorized', false, 320);
        uncatCol = document.getElementById(`col-${newId}`);
    }

    const colId = uncatCol.id.replace('col-', '');

    // Tambahkan item (cek duplikat dulu)
    const alreadyExists = Array.from(uncatCol.querySelectorAll('.item')).some(item => 
        item.dataset.url === url
    );
    if (alreadyExists) {
        alert('✅ Sudah ada di Uncategorized');
        return;
    }

    const itemId = 'it-' + Date.now();
    addItemToDOM(colId, title, url, 'Added via bookmarklet', '', 0, false, itemId);
    saveData();

    // Notifikasi & bersihkan URL
    showToast(`✅ "${title}" ditambahkan ke Uncategorized`);
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Toast sederhana
function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#00d4ff; color:#000; padding:12px 20px; border-radius:6px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.5); z-index:9999;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

// =============================================
// FUNGSI CREATE KOLOM (sudah termasuk fix sebelumnya)
// =============================================
function createColumn(id, title, isCollapsed = false, width = 300) {
    const board = document.getElementById('mainBoard');
    const col = document.createElement('div');
    col.className = `column ${isCollapsed ? 'collapsed' : ''}`;
    col.id = `col-${id}`;
    col.style.width = `${width}px`;

    col.innerHTML = `
        <div class="col-header">
            <span class="col-fold" onclick="toggleCollapse('${id}')">${isCollapsed ? '▶' : '▼'}</span>
            <span class="col-title">${title}</span>
            <div class="action-btns">
                <button class="btn-icon" onclick="openEntryModal('${id}')">➕</button>
                <button class="btn-icon edit-only" onclick="deleteCol('${id}')">🗑️</button>
            </div>
        </div>
        <div class="column-body" id="body-${id}"></div>
        <div class="resize-handle edit-only"></div>
    `;

    board.appendChild(col);

    Sortable.create(document.getElementById(`body-${id}`), { group: 'airdrop', animation: 150, onEnd: saveData });
    if (isEditMode) initResize(col);
    return col;
}

// (Semua fungsi lain tetap sama seperti versi sebelumnya: renderAllData, addItemToDOM, saveData, toggleEdit, openCatModal, submitCat, openEntryModal, deleteItem, deleteCol, toggleCheck, toggleCollapse, toggleNote, closeModal, handleSearch, updateAllCountdowns, initResize)

function renderAllData(data) {
    const board = document.getElementById('mainBoard');
    board.innerHTML = '';

    if (!data || data.length === 0) {
        const defaultId = Date.now().toString();
        createColumn(defaultId, 'Daily Task', false, 300);
        saveData();
        return;
    }

    data.forEach(c => {
        const col = createColumn(c.id, c.title, c.coll || false, c.width || 300);
        if (c.items) {
            c.items.forEach(i => addItemToDOM(c.id, i.t, i.u, i.n, i.r, i.lc, i.c, i.id));
        }
    });
    updateAllCountdowns();
}

// ... (paste semua fungsi sisanya dari script.js versi sebelumnya yang sudah saya kasih — toggleCheck, deleteItem, dll. Semua tetap sama)

function addItemToDOM(colId, title, url, note, resetType, lastCompleted, checked, id) {
    // (kode yang sama seperti sebelumnya — sudah aman)
    // ... (saya singkat di sini biar tidak terlalu panjang, tapi pakai yang versi terakhir)
}