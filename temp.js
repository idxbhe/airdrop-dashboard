// ==================== AIRDROP_TERMINAL v17.0 — FINAL STABLE ====================
// Firebase sync sempurna, add category/entry langsung tersimpan, switch kategori, drag antar kategori

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dashboardData = [];
let currentCategoryId = null;
let selectedItemId = null;
let activeItemId = null;   // untuk edit/new
let isLoading = false;

let categorySortable = null;
let entriesSortable = null;

document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess();
    setInterval(updateAllCountdowns, 1000);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('btnSaveItem').addEventListener('click', handleSaveEntry);
});

function startLoadingProcess() {
    isLoading = true;
    const localStr = localStorage.getItem('airdrop_terminal_v7');
    
    if (localStr) {
        dashboardData = JSON.parse(localStr);
    } else {
        dashboardData = [{ id: Date.now().toString(), title: "Daily Tasks", items: [] }];
    }

    // Repair data lama
    dashboardData.forEach(cat => {
        if (!Array.isArray(cat.items)) cat.items = [];
    });

    renderAll();

    // Firebase realtime listener
    db.ref('dashboard_data').on('value', (snapshot) => {
        const cloud = snapshot.val();
        if (cloud) {
            dashboardData = cloud;
            localStorage.setItem('airdrop_terminal_v7', JSON.stringify(dashboardData));
            renderAll();
        }
        isLoading = false;
    });
}

function renderAll() {
    if (dashboardData.length === 0) {
        dashboardData = [{ id: Date.now().toString(), title: "Daily Tasks", items: [] }];
        saveData();
    }
    if (!currentCategoryId || !dashboardData.find(c => c.id === currentCategoryId)) {
        currentCategoryId = dashboardData[0].id;
    }
    renderCategories();
    renderEntries(currentCategoryId);
    if (selectedItemId) showDetail(selectedItemId);
    else clearDetail();
}

// ===================== CATEGORIES =====================
function renderCategories() {
    const ul = document.getElementById('categoryList');
    ul.innerHTML = '';

    dashboardData.forEach(cat => {
        const li = document.createElement('li');
        li.className = `category-item ${cat.id === currentCategoryId ? 'active' : ''}`;
        li.innerHTML = `<span>${cat.title}</span><span class="item-count">${cat.items.length}</span>`;
        li.onclick = () => switchCategory(cat.id);
        li.ondragover = e => e.preventDefault();
        li.ondrop = e => moveItemToCategory(e, cat.id);
        ul.appendChild(li);
    });

    if (categorySortable) categorySortable.destroy();
    categorySortable = Sortable.create(ul, { animation: 180, onEnd: () => { saveData(); renderCategories(); } });
}

function switchCategory(catId) {
    currentCategoryId = catId;
    selectedItemId = null;
    renderCategories();
    renderEntries(catId);
    clearDetail();
}

function moveItemToCategory(e, targetCatId) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || targetCatId === currentCategoryId) return;

    let moved = false;
    for (let cat of dashboardData) {
        const idx = cat.items.findIndex(i => i.id === itemId);
        if (idx > -1) {
            const item = cat.items.splice(idx, 1)[0];
            dashboardData.find(c => c.id === targetCatId).items.push(item);
            moved = true;
            break;
        }
    }
    if (moved) {
        saveData();
        renderAll();
    }
}

// ===================== ENTRIES =====================
function renderEntries(catId) {
    const cat = dashboardData.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('currentCategoryName').textContent = cat.title;
    const container = document.getElementById('entriesList');
    container.innerHTML = '';

    sortEntriesInCurrentCategory();

    cat.items.forEach(item => {
        container.appendChild(createEntryElement(item));
    });

    if (entriesSortable) entriesSortable.destroy();
    entriesSortable = Sortable.create(container, {
        animation: 150,
        onEnd: () => { reorderItemsInCategory(catId); saveData(); }
    });
}

function createEntryElement(item) {
    const div = document.createElement('div');
    div.className = `entry-item ${item.id === selectedItemId ? 'active' : ''}`;
    div.dataset.id = item.id;
    div.draggable = true;
    div.ondragstart = e => e.dataTransfer.setData('text/plain', item.id);

    const isUrl = item.u && item.u.startsWith('http');
    const hasReset = item.r && item.r !== '' && item.r !== 'checklist';

    let favicon = '';
    if (isUrl) {
        try {
            const domain = new URL(item.u).hostname;
            favicon = `<img src="https://www.google.com/s2/favicons?domain=${domain}" style="width:16px;height:16px;border-radius:3px;">`;
        } catch(e) {}
    }

    div.innerHTML = `
        <div class="entry-main">
            ${favicon}
            <span class="item-title">${item.t}</span>
            ${hasReset ? `<span class="countdown">Resets in ...</span>` : ''}
            ${isUrl ? `<a href="${item.u}" target="_blank" class="btn-open-link" onclick="event.stopImmediatePropagation()">OPEN</a>` : ''}
            ${hasReset || item.r === 'checklist' ? 
                `<input type="checkbox" class="chk-box" ${item.c?'checked':''} onchange="toggleCheck('${item.id}', event)">` : ''}
        </div>
    `;

    div.onclick = (e) => {
        if (!e.target.closest('.chk-box') && !e.target.closest('a')) showDetail(item.id);
    };
    return div;
}

function sortEntriesInCurrentCategory() {
    const cat = dashboardData.find(c => c.id === currentCategoryId);
    if (!cat) return;
    const unchecked = cat.items.filter(i => !i.c);
    const checked = cat.items.filter(i => i.c);
    checked.sort((a, b) => getResetRemaining(a) - getResetRemaining(b));
    cat.items = [...unchecked, ...checked];
}

function reorderItemsInCategory(catId) {
    const cat = dashboardData.find(c => c.id === catId);
    const container = document.getElementById('entriesList');
    const newOrder = Array.from(container.children).map(el => el.dataset.id);
    cat.items.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
}

// ===================== DETAIL & DELETE =====================
function showDetail(itemId) {
    selectedItemId = itemId;
    document.querySelectorAll('.entry-item').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`.entry-item[data-id="${itemId}"]`);
    if (el) el.classList.add('active');

    const item = findItem(itemId);
    if (!item) return;

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-title">${item.t}</div>
        ${item.u ? `<a href="${item.u}" target="_blank" style="color:var(--accent);display:block;margin:12px 0;">🔗 ${item.u}</a>` : ''}
        ${item.r ? `<div style="background:#1a1a1f;padding:6px 10px;border-radius:4px;font-size:12px;margin-bottom:12px;">Reset: <strong>${getResetTypeLabel(item.r)}</strong></div>` : ''}
        <div class="detail-note">${item.n ? item.n.replace(/\n/g, '<br>') : '<em>Tidak ada catatan.</em>'}</div>
        ${item.lc ? `<div style="margin-top:20px;font-size:11px;color:#666;">Last completed: ${new Date(parseInt(item.lc)).toLocaleString('id-ID')}</div>` : ''}
    `;
}

function deleteCurrentItem() {
    if (!selectedItemId || !confirm('Hapus entry ini?')) return;
    for (let cat of dashboardData) {
        cat.items = cat.items.filter(i => i.id !== selectedItemId);
    }
    selectedItemId = null;
    clearDetail();
    saveData();
    renderAll();
}

// ===================== SAVE ENTRY =====================
function handleSaveEntry() {
    const title = document.getElementById('inpT').value.trim();
    if (!title) { alert("Title wajib diisi!"); return; }

    const url = document.getElementById('inpU').value.trim();
    const note = document.getElementById('inpN').value.trim();
    let resetType = document.getElementById('inpReset').value;
    if (resetType === 'custom') {
        const t = document.getElementById('inpCustomTime').value;
        resetType = t ? 'clock:' + t : 'daily';
    }

    const cat = dashboardData.find(c => c.id === currentCategoryId);
    if (!cat) { alert("Pilih kategori dulu!"); return; }

    if (activeItemId) {
        const item = cat.items.find(i => i.id === activeItemId);
        if (item) {
            item.t = title;
            item.u = url;
            item.n = note;
            item.r = resetType;
        }
    } else {
        cat.items.push({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            t: title, u: url, n: note, r: resetType, lc: 0, c: false
        });
    }

    closeModal('entryModal');
    saveData();
    renderAll();           // refresh semua
    activeItemId = null;
}

// ===================== CHECKBOX + COUNTDOWN =====================
function toggleCheck(itemId, e) {
    e.stopImmediatePropagation();
    const item = findItem(itemId);
    if (!item) return;
    item.c = !item.c;
    item.lc = item.c ? Date.now() : 0;
    sortEntriesInCurrentCategory();
    saveData();
    renderAll();
    if (selectedItemId === itemId) showDetail(itemId);
    updateAllCountdowns();
}

function getResetRemaining(item) {
    const type = item.r || '';
    if (!type || type === 'checklist') return Infinity;
    const last = parseInt(item.lc) || 0;
    const now = Date.now();
    if (type.startsWith('clock:')) {
        const [h, m] = type.substring(6).split(':').map(Number);
        let resetTime = new Date(now);
        resetTime.setHours(h, m, 0, 0);
        let resetMs = resetTime.getTime();
        return resetMs > now ? resetMs - now : resetMs + 86400000 - now;
    } else {
        let duration = type === 'daily' ? 86400000 : type === 'weekly' ? 604800000 : 2592000000;
        return last > 0 ? (last + duration) - now : Infinity;
    }
}

function updateAllCountdowns() {
    dashboardData.forEach(cat => {
        cat.items.forEach(item => {
            if (!item.r || item.r === 'checklist') return;
            const el = document.querySelector(`.entry-item[data-id="${item.id}"] .countdown`);
            if (!el) return;
            const remaining = getResetRemaining(item);
            if (remaining <= 0 && item.c) {
                item.c = false; item.lc = 0;
                el.innerText = "Ready";
            } else if (remaining < Infinity) {
                const h = Math.floor(remaining / 3600000).toString().padStart(2, '0');
                const m = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
                el.innerText = `Resets in ${h}:${m}:${s}`;
            }
        });
    });
}

// ===================== MODALS & UTILITY =====================
function openEntryModal(itemId = null) {
    activeItemId = itemId;
    const modal = document.getElementById('entryModal');
    
    document.getElementById('inpT').value = '';
    document.getElementById('inpU').value = '';
    document.getElementById('inpN').value = '';
    document.getElementById('inpReset').value = '';
    document.getElementById('inpCustomTime').style.display = 'none';

    if (itemId) {
        const item = findItem(itemId);
        if (item) {
            document.getElementById('inpT').value = item.t || '';
            document.getElementById('inpU').value = item.u || '';
            document.getElementById('inpN').value = item.n || '';
            let rType = item.r || '';
            if (rType.startsWith('clock:')) {
                document.getElementById('inpReset').value = 'custom';
                document.getElementById('inpCustomTime').value = rType.substring(6);
                document.getElementById('inpCustomTime').style.display = 'block';
            } else {
                document.getElementById('inpReset').value = rType;
            }
        }
    }
    modal.style.display = 'flex';
    document.getElementById('inpT').focus();
}

function autoCompleteUrl() {
    const input = document.getElementById('inpU');
    let v = input.value.trim();
    if (v && !v.startsWith('http') && v.includes('.')) input.value = 'https://' + v;
}

async function fetchTitleManual() {
    let url = document.getElementById('inpU').value.trim();
    if (!url.startsWith('http')) { alert('Masukkan URL dulu'); return; }
    const btn = event.currentTarget;
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳'; btn.disabled = true;
    try {
        const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        const html = await res.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
            document.getElementById('inpT').value = match[1].trim()
                .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        }
    } catch(e) { alert('Gagal fetch title'); }
    btn.innerHTML = orig; btn.disabled = false;
}

function handleResetTypeChange() {
    const v = document.getElementById('inpReset').value;
    document.getElementById('inpCustomTime').style.display = (v === 'custom') ? 'block' : 'none';
}

function handleSearch(e) {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.entry-item').forEach(el => {
        const title = el.querySelector('.item-title').textContent.toLowerCase();
        el.style.display = (q === '' || title.includes(q)) ? '' : 'none';
    });
}

function openCatModal() { document.getElementById('catModal').style.display = 'flex'; }

function submitCat() {
    const name = document.getElementById('inpCatName').value.trim();
    if (!name) return;
    dashboardData.push({ id: Date.now().toString(), title: name, items: [] });
    saveData();
    closeModal('catModal');
    document.getElementById('inpCatName').value = '';
    renderAll();
}

function editCurrentItem() {
    if (selectedItemId) openEntryModal(selectedItemId);
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function findItem(itemId) {
    for (let cat of dashboardData) {
        const found = cat.items.find(i => i.id === itemId);
        if (found) return found;
    }
    return null;
}

function saveData() {
    if (isLoading) return;
    localStorage.setItem('airdrop_terminal_v7', JSON.stringify(dashboardData));
    db.ref('dashboard_data').set(dashboardData);
}

function getResetTypeLabel(r) {
    if (r.startsWith('clock:')) return `Daily at ${r.substring(6)}`;
    if (r === 'daily') return 'Daily (24 jam)';
    if (r === 'weekly') return 'Weekly';
    if (r === 'monthly') return 'Monthly';
    if (r === 'checklist') return 'Checklist Only';
    return r || 'No Reset';
}

function clearDetail() {
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Klik salah satu entry di tengah</div>`;
    selectedItemId = null;
}

// Expose ke HTML
window.openEntryModal = openEntryModal;
window.fetchTitleManual = fetchTitleManual;
window.autoCompleteUrl = autoCompleteUrl;
window.handleResetTypeChange = handleResetTypeChange;
window.openCatModal = openCatModal;
window.submitCat = submitCat;
window.editCurrentItem = editCurrentItem;
window.deleteCurrentItem = deleteCurrentItem;
window.closeModal = closeModal;
window.toggleCheck = toggleCheck;

console.log('%c✅ AIRDROP_TERMINAL v17.0 — FULLY STABLE & READY!', 'color:#00d4ff;font-weight:bold;font-size:15px');