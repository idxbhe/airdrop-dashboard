// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let isEditMode = false;
let activeColId = null;      // ← DITAMBAHKAN
let activeItemId = null;     // ← DITAMBAHKAN
let columnSortable = null;
let saveDebounceTimer = null;
let isLoading = false;

// =============================================
// 1. PROSES PEMUATAN DATA
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess();
    setInterval(updateAllCountdowns, 1000);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
});

function startLoadingProcess() {
    isLoading = true;

    const localDataStr = localStorage.getItem('airdrop_terminal_v7');
    const localData = localDataStr ? JSON.parse(localDataStr) : null;

    if (localData && localData.length > 0) {
        renderAllData(localData);
    } else {
        renderAllData(null);
    }

    db.ref('dashboard_data').on('value', (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData !== null) {
            localStorage.setItem('airdrop_terminal_v7', JSON.stringify(cloudData));
            renderAllData(cloudData);
        }
        isLoading = false;
    });
}

// =============================================
// 2. CREATE KOLOM LENGKAP (ID sudah diperbaiki)
// =============================================
function createColumn(id, title, isCollapsed = false, width = 300) {
    const board = document.getElementById('mainBoard');
    const col = document.createElement('div');
    col.className = `column ${isCollapsed ? 'collapsed' : ''}`;
    col.id = `col-${id}`;                    // ← ID bersih
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

    Sortable.create(document.getElementById(`body-${id}`), {
        group: 'airdrop',
        animation: 150,
        onEnd: saveData
    });

    if (isEditMode) initResize(col);
    return col;
}

// =============================================
// 3. RENDER & FUNGSI LAINNYA (sudah bersih)
// =============================================
function renderAllData(data) {
    const board = document.getElementById('mainBoard');
    board.innerHTML = '';

    if (!data || data.length === 0) {
        const defaultId = Date.now().toString();   // ← ID bersih
        createColumn(defaultId, 'Daily Task', false, 300);
        saveData();
        return;
    }

    data.forEach(c => {
        const col = createColumn(c.id, c.title, c.coll || false, c.width || 300);
        if (c.items) {
            c.items.forEach(i => {
                addItemToDOM(c.id, i.t, i.u, i.n, i.r, i.lc, i.c, i.id);
            });
        }
    });
    updateAllCountdowns();
}

function addItemToDOM(colId, title, url, note, resetType, lastCompleted, checked, id) {
    const isUrl = url && url.startsWith('http');
    const hasReset = !!resetType;

    let faviconSrc = '';
    if (isUrl) {
        try {
            const hostname = new URL(url).hostname;
            faviconSrc = `https://www.google.com/s2/favicons?domain=${hostname}`;
        } catch (e) {}
    }

    const it = document.createElement('div');
    it.className = 'item';
    it.id = id;
    it.dataset.url = url || '';
    it.dataset.note = note || '';
    it.dataset.resetType = resetType || '';
    it.dataset.lastCompleted = lastCompleted || 0;

    const titleStyle = checked ? 'text-decoration:line-through; opacity:0.4' : '';

    it.innerHTML = `
        <div class="item-main">
            <span class="btn-icon note-fold" onclick="toggleNote('${id}')">▶</span>
            <div class="fav-box" style="${isUrl && faviconSrc ? '' : 'display:none'}">
                <img class="fav-img" src="${faviconSrc}">
            </div>
            <span class="item-title" style="${titleStyle}">${title}</span>
            <div class="action-btns">
                ${hasReset ? `<input type="checkbox" class="chk-box" ${checked ? 'checked' : ''} onchange="toggleCheck('${id}')">` : ''}
                ${isUrl ? `<a href="${url}" target="_blank" class="btn-open-link">OPEN ↗</a>` : ''}
                <button class="btn-icon edit-only" onclick="openEntryModal('${colId}','${id}'); event.stopPropagation();">✏️</button>
                <button class="btn-icon edit-only" onclick="deleteItem('${id}'); event.stopPropagation();">❌</button>
            </div>
        </div>
        ${hasReset ? `<span class="reset-status"></span>` : ''}
        <div class="note-preview" id="note-${id}">${note || ''}</div>
    `;

    document.getElementById(`body-${colId}`).appendChild(it);
}

// =============================================
// 4. SAVE, MODAL, EDIT MODE (sudah 100% berfungsi)
// =============================================
function saveData() {
    if (isLoading) return;
    const data = [];
    document.querySelectorAll('.column').forEach(c => {
        const items = [];
        c.querySelectorAll('.item').forEach(i => {
            items.push({
                id: i.id,
                t: i.querySelector('.item-title').innerText,
                u: i.dataset.url,
                n: i.dataset.note,
                r: i.dataset.resetType || '',
                lc: parseInt(i.dataset.lastCompleted) || 0,
                c: i.querySelector('.chk-box')?.checked || false
            });
        });
        data.push({
            id: c.id.replace('col-', ''),
            title: c.querySelector('.col-title').innerText,
            coll: c.classList.contains('collapsed'),
            width: c.offsetWidth,
            items
        });
    });

    localStorage.setItem('airdrop_terminal_v7', JSON.stringify(data));
    db.ref('dashboard_data').set(data);
}

function openCatModal() {
    document.getElementById('catModal').style.display = 'flex';
    document.getElementById('inpCatName').focus();
}

function submitCat() {
    const name = document.getElementById('inpCatName').value.trim();
    if (name) {
        const newId = Date.now().toString();   // ← ID bersih
        createColumn(newId, name, false, 300);
        saveData();
        closeModal('catModal');
        document.getElementById('inpCatName').value = '';
    }
}

function toggleEdit() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode-on', isEditMode);
    document.getElementById('masterEditBtn').innerText = 
        isEditMode ? "⚙️ EDIT MODE: ON" : "⚙️ EDIT MODE: OFF";

    if (isEditMode) {
        columnSortable = Sortable.create(document.getElementById('mainBoard'), {
            group: 'columns',
            animation: 150,
            handle: '.col-header',
            onEnd: saveData
        });
        document.querySelectorAll('.column').forEach(col => initResize(col));
    } else if (columnSortable) {
        columnSortable.destroy();
    }
}

// (fungsi-fungsi lain tetap sama seperti versi sebelumnya: openEntryModal, toggleCheck, deleteItem, deleteCol, toggleCollapse, toggleNote, closeModal, updateAllCountdowns, initResize, handleSearch)

function openEntryModal(colId, itemId = null) {
    activeColId = colId;
    activeItemId = itemId;
    const it = itemId ? document.getElementById(itemId) : null;
    document.getElementById('inpT').value = it ? it.querySelector('.item-title').innerText : '';
    document.getElementById('inpU').value = it ? it.dataset.url : '';
    document.getElementById('inpN').value = it ? it.dataset.note : '';
    document.getElementById('inpReset').value = it ? it.dataset.resetType : '';
    document.getElementById('entryModal').style.display = 'flex';
}

document.getElementById('btnSaveItem').onclick = () => {
    const t = document.getElementById('inpT').value.trim();
    if (!t) return;
    if (activeItemId) document.getElementById(activeItemId).remove();
    
    const tempId = activeItemId || 'it-' + Date.now();
    addItemToDOM(activeColId, t, document.getElementById('inpU').value.trim(), 
                 document.getElementById('inpN').value.trim(), 
                 document.getElementById('inpReset').value, 0, false, tempId);
    
    saveData();
    closeModal('entryModal');
};

function deleteItem(id) {
    if (confirm('Hapus item ini?')) { document.getElementById(id).remove(); saveData(); }
}
function deleteCol(id) {
    if (confirm('Hapus kolom ini beserta SEMUA isinya?')) { document.getElementById(`col-${id}`).remove(); saveData(); }
}
function toggleCheck(id) {
    const it = document.getElementById(id);
    const chk = it.querySelector('.chk-box');
    const title = it.querySelector('.item-title');
    title.style.textDecoration = chk.checked ? 'line-through' : 'none';
    title.style.opacity = chk.checked ? '0.4' : '1';
    it.dataset.lastCompleted = chk.checked ? Date.now() : 0;
    saveData();
}
function toggleCollapse(id) {
    const col = document.getElementById(`col-${id}`);
    col.classList.toggle('collapsed');
    saveData();
}
function toggleNote(id) {
    const note = document.getElementById(`note-${id}`);
    if (note) note.classList.toggle('show');
}
function closeModal(mId) {
    document.getElementById(mId).style.display = 'none';
}
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.item').forEach(it => {
        const title = it.querySelector('.item-title').innerText.toLowerCase();
        const url = it.dataset.url.toLowerCase();
        it.classList.toggle('hidden', !(title.includes(query) || url.includes(query)));
    });
}
function updateAllCountdowns() {
    const now = Date.now();
    let needsSave = false;
    document.querySelectorAll('.item').forEach(it => {
        const type = it.dataset.resetType;
        if (!type) return;
        const lastComp = parseInt(it.dataset.lastCompleted) || 0;
        const statusEl = it.querySelector('.reset-status');
        if (lastComp > 0) {
            const duration = type === 'daily' ? 86400000 : type === 'weekly' ? 604800000 : 2592000000;
            const remaining = (lastComp + duration) - now;
            if (remaining <= 0) {
                const chk = it.querySelector('.chk-box');
                const title = it.querySelector('.item-title');
                if (chk) chk.checked = false;
                if (title) { title.style.textDecoration = 'none'; title.style.opacity = '1'; }
                it.dataset.lastCompleted = 0;
                needsSave = true;
            } else if (statusEl) {
                const h = Math.floor(remaining / 3600000).toString().padStart(2, '0');
                const m = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
                statusEl.innerText = `Resets in ${h}:${m}:${s}`;
            }
        } else if (statusEl) {
            statusEl.innerText = "Ready to complete";
        }
    });
    if (needsSave) {
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(saveData, 300);
    }
}
function initResize(col) {
    const handle = col.querySelector('.resize-handle');
    if (!handle) return;
    handle.onmousedown = e => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = col.offsetWidth;
        const onMouseMove = ev => {
            const newWidth = startWidth + (ev.clientX - startX);
            if (newWidth > 200) col.style.width = `${newWidth}px`;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveData();
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
}