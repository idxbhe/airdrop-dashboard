// ==================== AIRDROP TERMINAL v13.2 (SEARCH AUTO UNFOLD + EDIT CATEGORY) ====================
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let isEditMode = false;
let activeColId = null;
let activeItemId = null;
let columnSortable = null;
let saveDebounceTimer = null;
let isLoading = false;

// =============================================
// 1. LOAD
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess();
    setInterval(updateAllCountdowns, 1000);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
});

function startLoadingProcess() {
    isLoading = true;
    const localDataStr = localStorage.getItem('airdrop_terminal_v7');
    if (localDataStr) renderAllData(JSON.parse(localDataStr));
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
// 2. EDIT CATEGORY TITLE (baru)
// =============================================
function editColumnTitle(id) {
    const col = document.getElementById(`col-${id}`);
    const titleEl = col.querySelector('.col-title');
    const newTitle = prompt('Ubah nama kategori:', titleEl.innerText.trim());
    if (newTitle && newTitle.trim() !== '') {
        titleEl.innerText = newTitle.trim();
        saveData();
    }
}

// =============================================
// 3. SEARCH + AUTO UNFOLD (diperbaiki)
// =============================================
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    document.querySelectorAll('.item').forEach(it => {
        const title = it.querySelector('.item-title').innerText.toLowerCase();
        const url = it.dataset.url.toLowerCase();
        const match = title.includes(query) || url.includes(query);
        it.classList.toggle('hidden', !match);
    });

    // AUTO UNFOLD kolom yang ada hasil pencarian
    document.querySelectorAll('.column').forEach(col => {
        const hasVisible = Array.from(col.querySelectorAll('.item')).some(item => 
            !item.classList.contains('hidden')
        );
        if (hasVisible) {
            col.classList.remove('collapsed');
        }
    });
}

// =============================================
// 4. HELPER RESET TIME (dari versi sebelumnya)
// =============================================
function getResetRemaining(item) {
    const type = item.dataset.resetType || '';
    if (!type || type === 'checklist') return Infinity;

    const last = parseInt(item.dataset.lastCompleted) || 0;
    const now = Date.now();

    if (type.startsWith('clock:') || type === 'custom') {
        const timeStr = type.startsWith('clock:') ? type.substring(6) : (item.dataset.resetTime || '00:00');
        const [h, m] = timeStr.split(':').map(Number);
        let resetToday = new Date(now);
        resetToday.setHours(h, m, 0, 0);
        const resetMs = resetToday.getTime();
        return resetMs > now ? resetMs - now : resetMs + 86400000 - now;
    } else {
        const duration = type === 'daily' ? 86400000 : type === 'weekly' ? 604800000 : 2592000000;
        return last > 0 ? (last + duration) - now : Infinity;
    }
}

// =============================================
// 5. AUTO SORTING
// =============================================
function sortColumn(colId) {
    const body = document.getElementById(`body-${colId}`);
    if (!body) return;

    const items = Array.from(body.children);
    const unchecked = items.filter(it => {
        const chk = it.querySelector('.chk-box');
        return !chk || !chk.checked;
    });
    const checked = items.filter(it => {
        const chk = it.querySelector('.chk-box');
        return chk && chk.checked;
    });

    checked.sort((a, b) => getResetRemaining(a) - getResetRemaining(b));

    body.innerHTML = '';
    unchecked.forEach(i => body.appendChild(i));
    checked.forEach(i => body.appendChild(i));
}

// =============================================
// 6. CREATE COLUMN (tombol edit ditambahkan)
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
                <button class="btn-icon edit-only" onclick="editColumnTitle('${id}')">✏️</button>
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

// (semua fungsi lain tetap sama seperti versi v13.1 sebelumnya — addItemToDOM, saveData, toggleCheck, updateAllCountdowns, openEntryModal, handleResetTypeChange, dll.)

function renderAllData(data) {
    const board = document.getElementById('mainBoard');
    board.innerHTML = '';
    if (!data || data.length === 0) {
        createColumn(Date.now().toString(), 'Daily Task', false, 300);
        saveData();
        return;
    }
    data.forEach(c => {
        const col = createColumn(c.id, c.title, c.coll || false, c.width || 300);
        if (c.items) c.items.forEach(i => addItemToDOM(c.id, i.t, i.u, i.n, i.r, i.rt, i.lc, i.c, i.id));
        sortColumn(c.id);
    });
    updateAllCountdowns();
}

function addItemToDOM(colId, title, url, note, resetType, resetTime, lastCompleted, checked, id) {
    const isUrl = url && url.startsWith('http');
    let faviconSrc = '';
    if (isUrl) {
        try { faviconSrc = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`; } catch(e) {}
    }
    const hasCheckbox = resetType !== '' && resetType !== 'noreset';

    const it = document.createElement('div');
    it.className = 'item';
    it.id = id;
    it.dataset.url = url || '';
    it.dataset.note = note || '';
    it.dataset.resetType = resetType || '';
    it.dataset.resetTime = resetTime || '';
    it.dataset.lastCompleted = lastCompleted || 0;

    const titleStyle = checked ? 'text-decoration:line-through; opacity:0.4' : '';

    it.innerHTML = `
        <div class="item-main">
            <span class="btn-icon note-fold" onclick="toggleNote('${id}')">▶</span>
            <div class="fav-box" style="${isUrl && faviconSrc ? '' : 'display:none'}"><img class="fav-img" src="${faviconSrc}"></div>
            <span class="item-title" style="${titleStyle}">${title}</span>
            <div class="action-btns">
                ${hasCheckbox ? `<input type="checkbox" class="chk-box" ${checked?'checked':''} onchange="toggleCheck('${id}')">` : ''}
                ${isUrl ? `<a href="${url}" target="_blank" class="btn-open-link">OPEN ↗</a>` : ''}
                <button class="btn-icon edit-only" onclick="openEntryModal('${colId}','${id}');event.stopPropagation();">✏️</button>
                <button class="btn-icon edit-only" onclick="deleteItem('${id}');event.stopPropagation();">❌</button>
            </div>
        </div>
        ${hasCheckbox ? `<span class="reset-status"></span>` : ''}
        <div class="note-preview" id="note-${id}">${note||''}</div>
    `;
    document.getElementById(`body-${colId}`).appendChild(it);
}

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
                rt: i.dataset.resetTime || '',
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

// === FUNGSI LAINNYA (toggleCheck, updateAllCountdowns, openEntryModal, dll.) ===
function toggleCheck(id) {
    const it = document.getElementById(id);
    const chk = it.querySelector('.chk-box');
    const title = it.querySelector('.item-title');
    title.style.textDecoration = chk.checked ? 'line-through' : 'none';
    title.style.opacity = chk.checked ? '0.4' : '1';
    it.dataset.lastCompleted = chk.checked ? Date.now() : 0;
    const colId = it.closest('.column').id.replace('col-', '');
    saveData();
    sortColumn(colId);
}

function updateAllCountdowns() {
    const now = Date.now();
    let needSave = false;
    document.querySelectorAll('.item').forEach(it => {
        const type = it.dataset.resetType || '';
        if (!type || type === 'checklist') return;
        const statusEl = it.querySelector('.reset-status');
        const lastComp = parseInt(it.dataset.lastCompleted) || 0;
        if (lastComp === 0) {
            if (statusEl) statusEl.innerText = "Ready to complete";
        } else {
            let remaining = getResetRemaining(it);
            if (remaining <= 0) {
                const chk = it.querySelector('.chk-box');
                const title = it.querySelector('.item-title');
                if (chk) chk.checked = false;
                if (title) { title.style.textDecoration = 'none'; title.style.opacity = '1'; }
                it.dataset.lastCompleted = 0;
                needSave = true;
                if (statusEl) statusEl.innerText = "Ready to complete";
            } else {
                const h = Math.floor(remaining / 3600000).toString().padStart(2, '0');
                const m = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
                if (statusEl) statusEl.innerText = `Resets in ${h}:${m}:${s}`;
            }
        }
    });
    if (needSave) {
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(saveData, 300);
    }
}

function handleResetTypeChange() {
    const val = document.getElementById('inpReset').value;
    document.getElementById('inpCustomTime').style.display = (val === 'custom') ? 'block' : 'none';
}

function openEntryModal(colId, itemId = null) {
    activeColId = colId; activeItemId = itemId;
    const it = itemId ? document.getElementById(itemId) : null;
    document.getElementById('inpT').value = it ? it.querySelector('.item-title').innerText : '';
    document.getElementById('inpU').value = it ? it.dataset.url : '';
    document.getElementById('inpN').value = it ? it.dataset.note : '';
    let resetType = it ? it.dataset.resetType : '';
    const resetTime = it ? it.dataset.resetTime : '';
    if (resetType.startsWith('clock:')) {
        document.getElementById('inpReset').value = 'custom';
        document.getElementById('inpCustomTime').value = resetType.substring(6);
        document.getElementById('inpCustomTime').style.display = 'block';
    } else {
        document.getElementById('inpReset').value = resetType || '';
        document.getElementById('inpCustomTime').style.display = 'none';
    }
    document.getElementById('entryModal').style.display = 'flex';
}

// === sisanya sama (openCatModal, submitCat, toggleEdit, deleteItem, deleteCol, toggleCollapse, toggleNote, closeModal, initResize) ===
function openCatModal() { document.getElementById('catModal').style.display = 'flex'; }
function submitCat() {
    const name = document.getElementById('inpCatName').value.trim();
    if (name) { createColumn(Date.now().toString(), name); saveData(); closeModal('catModal'); document.getElementById('inpCatName').value = ''; }
}
function toggleEdit() {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode-on', isEditMode);
    document.getElementById('masterEditBtn').innerText = isEditMode ? "⚙️ EDIT MODE: ON" : "⚙️ EDIT MODE: OFF";
    if (isEditMode) {
        columnSortable = Sortable.create(document.getElementById('mainBoard'), {group:'columns', animation:150, handle:'.col-header', onEnd:saveData});
        document.querySelectorAll('.column').forEach(col => initResize(col));
    } else if (columnSortable) columnSortable.destroy();
}
function deleteItem(id) { if(confirm('Hapus item?')){document.getElementById(id).remove();saveData();}}
function deleteCol(id) { if(confirm('Hapus kolom?')){document.getElementById(`col-${id}`).remove();saveData();}}
function toggleCollapse(id) { document.getElementById(`col-${id}`).classList.toggle('collapsed'); saveData(); }
function toggleNote(id) { const n=document.getElementById(`note-${id}`); if(n)n.classList.toggle('show'); }
function closeModal(mId) { document.getElementById(mId).style.display = 'none'; }
function initResize(col) {
    const handle = col.querySelector('.resize-handle');
    if(!handle) return;
    handle.onmousedown = e => {
        e.preventDefault();
        const startX = e.clientX, startW = col.offsetWidth;
        const move = ev => { const nw = startW + (ev.clientX - startX); if(nw>200) col.style.width = nw + 'px'; };
        const up = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); saveData(); };
        document.addEventListener('mousemove',move);
        document.addEventListener('mouseup',up);
    };
}