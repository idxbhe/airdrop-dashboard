// ==================== AIRDROP TERMINAL v12 (AUTO SORTING CHECKED ITEMS) ====================
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
// HELPER: HITUNG WAKTU RESET
// =============================================
function getRemainingTime(item) {
    const type = item.dataset.resetType;
    if (!type) return Infinity;
    const last = parseInt(item.dataset.lastCompleted) || 0;
    if (last === 0) return Infinity; // belum dicentang

    const duration = type === 'daily' ? 86400000 : type === 'weekly' ? 604800000 : 2592000000;
    return (last + duration) - Date.now();
}

// =============================================
// AUTO SORTING (FITUR UTAMA)
// =============================================
function sortColumn(colId) {
    const body = document.getElementById(`body-${colId}`);
    if (!body) return;

    const allItems = Array.from(body.children);

    // Pisahkan unchecked (active) dan checked (completed)
    const unchecked = allItems.filter(it => {
        const chk = it.querySelector('.chk-box');
        return !chk || !chk.checked;
    });

    const checked = allItems.filter(it => {
        const chk = it.querySelector('.chk-box');
        return chk && chk.checked;
    });

    // Sort checked items: makin dekat reset = makin atas
    checked.sort((a, b) => getRemainingTime(a) - getRemainingTime(b));

    // Kosongkan kolom lalu susun ulang
    body.innerHTML = '';
    unchecked.forEach(item => body.appendChild(item));
    checked.forEach(item => body.appendChild(item));
}

// =============================================
// CREATE COLUMN & RENDER
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
    Sortable.create(document.getElementById(`body-${id}`), { 
        group: 'airdrop', 
        animation: 150, 
        onEnd: () => { saveData(); } 
    });
    if (isEditMode) initResize(col);
    return col;
}

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
        if (c.items) c.items.forEach(i => addItemToDOM(c.id, i.t, i.u, i.n, i.r, i.lc, i.c, i.id));
        sortColumn(c.id); // auto sort saat render
    });
    updateAllCountdowns();
}

function addItemToDOM(colId, title, url, note, resetType, lastCompleted, checked, id) {
    const isUrl = url && url.startsWith('http');
    let faviconSrc = '';
    if (isUrl) {
        try { faviconSrc = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`; } catch(e) {}
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
            <div class="fav-box" style="${isUrl && faviconSrc ? '' : 'display:none'}"><img class="fav-img" src="${faviconSrc}"></div>
            <span class="item-title" style="${titleStyle}">${title}</span>
            <div class="action-btns">
                ${!!resetType ? `<input type="checkbox" class="chk-box" ${checked?'checked':''} onchange="toggleCheck('${id}')">` : ''}
                ${isUrl ? `<a href="${url}" target="_blank" class="btn-open-link">OPEN ↗</a>` : ''}
                <button class="btn-icon edit-only" onclick="openEntryModal('${colId}','${id}');event.stopPropagation();">✏️</button>
                <button class="btn-icon edit-only" onclick="deleteItem('${id}');event.stopPropagation();">❌</button>
            </div>
        </div>
        ${!!resetType ? `<span class="reset-status"></span>` : ''}
        <div class="note-preview" id="note-${id}">${note||''}</div>
    `;
    document.getElementById(`body-${colId}`).appendChild(it);
}

// =============================================
// SAVE
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

// =============================================
// TOGGLE CHECK + AUTO SORT
// =============================================
function toggleCheck(id) {
    const it = document.getElementById(id);
    const chk = it.querySelector('.chk-box');
    const title = it.querySelector('.item-title');
    
    title.style.textDecoration = chk.checked ? 'line-through' : 'none';
    title.style.opacity = chk.checked ? '0.4' : '1';
    
    it.dataset.lastCompleted = chk.checked ? Date.now() : 0;

    // Auto sort setelah di-check
    const col = it.closest('.column');
    const colId = col.id.replace('col-', '');
    saveData();
    sortColumn(colId);
}

// =============================================
// FUNGSI LAINNYA (sama seperti sebelumnya)
// =============================================
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
function openEntryModal(colId, itemId = null) {
    activeColId = colId; activeItemId = itemId;
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
    addItemToDOM(activeColId, t, document.getElementById('inpU').value.trim(), document.getElementById('inpN').value.trim(), document.getElementById('inpReset').value, 0, false, tempId);
    saveData();
    sortColumn(activeColId); // sort setelah tambah item baru
    closeModal('entryModal');
};
function deleteItem(id) { if(confirm('Hapus item?')){document.getElementById(id).remove();saveData();}}
function deleteCol(id) { if(confirm('Hapus kolom?')){document.getElementById(`col-${id}`).remove();saveData();}}
function toggleCollapse(id) { document.getElementById(`col-${id}`).classList.toggle('collapsed'); saveData(); }
function toggleNote(id) { const n=document.getElementById(`note-${id}`); if(n)n.classList.toggle('show'); }
function closeModal(mId) { document.getElementById(mId).style.display = 'none'; }
function handleSearch(e) {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.item').forEach(it => {
        const match = it.querySelector('.item-title').innerText.toLowerCase().includes(q) || it.dataset.url.toLowerCase().includes(q);
        it.classList.toggle('hidden', !match);
    });
}
function updateAllCountdowns() {
    const now = Date.now(); let needSave = false;
    document.querySelectorAll('.item').forEach(it => {
        const type = it.dataset.resetType; if(!type) return;
        const last = parseInt(it.dataset.lastCompleted)||0;
        const status = it.querySelector('.reset-status');
        if(last>0){
            const dur = type==='daily'?86400000:type==='weekly'?604800000:2592000000;
            const rem = last + dur - now;
            if(rem<=0){
                const chk = it.querySelector('.chk-box'); const title = it.querySelector('.item-title');
                if(chk) chk.checked=false; if(title){title.style.textDecoration='none';title.style.opacity='1';}
                it.dataset.lastCompleted=0; needSave=true;
            } else if(status){
                const h=Math.floor(rem/3600000).toString().padStart(2,'0');
                const m=Math.floor((rem%3600000)/60000).toString().padStart(2,'0');
                const s=Math.floor((rem%60000)/1000).toString().padStart(2,'0');
                status.innerText=`Resets in ${h}:${m}:${s}`;
            }
        } else if(status) status.innerText="Ready to complete";
    });
    if(needSave){ if(saveDebounceTimer) clearTimeout(saveDebounceTimer); saveDebounceTimer = setTimeout(saveData,300); }
}
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