// ==================== AIRDROP_TERMINAL v16.4 — FINAL STABLE ====================

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dashboardData = [];
let currentCategoryId = null;
let selectedItemId = null;
let activeItemId = null; 
let isSyncing = false; // Mencegah bentrok data dengan Firebase

let categorySortable = null;
let entriesSortable = null;

document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess();
    setInterval(updateAllCountdowns, 1000);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('btnSaveItem').addEventListener('click', handleSaveEntry);
});

// --- CORE DATA & SYNC ---
function startLoadingProcess() {
    // 1. Load dari LocalStorage untuk UI cepat
    const local = localStorage.getItem('airdrop_terminal_data');
    if (local) {
        try { 
            dashboardData = JSON.parse(local); 
            repairData(); 
            renderAll(); 
        } catch(e) {}
    }

    // 2. Load dari Firebase HANYA SEKALI di awal
    db.ref('dashboard_data').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            dashboardData = snapshot.val();
            repairData();
            saveLocal();
            renderAll();
        }

        // 3. Pasang listener HANYA SETELAH load awal selesai
        db.ref('dashboard_data').on('value', (liveSnap) => {
            if (!isSyncing && liveSnap.exists()) {
                const cloudData = liveSnap.val();
                if (JSON.stringify(cloudData) !== JSON.stringify(dashboardData)) {
                    dashboardData = cloudData;
                    repairData();
                    saveLocal();
                    renderAll();
                }
            }
        });
    });
}

function repairData() {
    if (!Array.isArray(dashboardData)) dashboardData = [];
    dashboardData.forEach(cat => {
        if (!cat.items || !Array.isArray(cat.items)) cat.items = [];
    });
}

function saveLocal() {
    localStorage.setItem('airdrop_terminal_data', JSON.stringify(dashboardData));
}

function saveData() {
    isSyncing = true;
    saveLocal();
    db.ref('dashboard_data').set(dashboardData).then(() => {
        // Jeda 500ms agar update lokal tidak langsung ditimpa oleh pantulan dari Firebase
        setTimeout(() => { isSyncing = false; }, 500); 
    });
}

// --- RENDERING ---
function renderAll() {
    if (dashboardData.length === 0) {
        dashboardData = [{ id: Date.now().toString(), title: "General", items: [] }];
        saveData();
    }
    
    // Pastikan kategori saat ini valid
    if (!currentCategoryId || !dashboardData.find(c => c.id === currentCategoryId)) {
        currentCategoryId = dashboardData[0].id;
    }
    
    renderCategories();
    renderEntries(currentCategoryId);
    
    if (selectedItemId) showDetail(selectedItemId);
}

function renderCategories() {
    const ul = document.getElementById('categoryList');
    ul.innerHTML = '';
    
    dashboardData.forEach(cat => {
        const li = document.createElement('li');
        li.className = `category-item ${cat.id === currentCategoryId ? 'active' : ''}`;
        li.innerHTML = `<span>${cat.title}</span><span class="item-count">${cat.items.length}</span>`;
        li.onclick = () => switchCategory(cat.id);
        ul.appendChild(li);
    });

    if (categorySortable) categorySortable.destroy();
    categorySortable = Sortable.create(ul, { 
        animation: 180, 
        onEnd: () => { 
            const newOrder = Array.from(ul.children).map(li => li.querySelector('span').innerText);
            dashboardData.sort((a,b) => newOrder.indexOf(a.title) - newOrder.indexOf(b.title));
            saveData(); 
        }
    });
}

function renderEntries(catId) {
    const cat = dashboardData.find(c => c.id === catId);
    if (!cat) return;
    
    document.getElementById('currentCategoryName').textContent = cat.title;
    const container = document.getElementById('entriesList');
    container.innerHTML = '';

    // Sort: Unchecked di atas, Checked di bawah
    const sortedItems = [...cat.items].sort((a, b) => (a.c === b.c) ? 0 : a.c ? 1 : -1);

    sortedItems.forEach(item => {
        container.appendChild(createEntryElement(item));
    });

    if (entriesSortable) entriesSortable.destroy();
    entriesSortable = Sortable.create(container, {
        animation: 150,
        handle: '.item-title',
        onEnd: () => {
            const newOrderIds = Array.from(container.children).map(el => el.dataset.id);
            cat.items.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
            saveData();
        }
    });
}

function createEntryElement(item) {
    const div = document.createElement('div');
    div.className = `entry-item ${item.id === selectedItemId ? 'active' : ''} ${item.c ? 'is-checked' : ''}`;
    div.dataset.id = item.id;

    let favicon = '';
    if (item.u) {
        try {
            const domain = new URL(item.u.startsWith('http') ? item.u : 'https://' + item.u).hostname;
            favicon = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" class="entry-icon" onerror="this.style.display='none'">`;
        } catch(e) {}
    }

    div.innerHTML = `
        <div class="entry-main">
            ${favicon}
            <span class="item-title">${item.t || 'Untitled'}</span>
            <div class="entry-right">
                ${item.r && item.r !== 'checklist' ? `<span class="countdown" data-id="${item.id}">--:--:--</span>` : ''}
                ${item.u ? `<a href="${item.u.startsWith('http') ? item.u : 'https://'+item.u}" target="_blank" class="btn-open-link btn" onclick="event.stopPropagation()">OPEN</a>` : ''}
                <input type="checkbox" class="chk-box" ${item.c ? 'checked' : ''} onclick="toggleCheck('${item.id}', event)">
            </div>
        </div>
    `;
    
    div.onclick = (e) => { 
        if(!e.target.closest('.chk-box') && !e.target.closest('.btn-open-link')) {
            showDetail(item.id); 
        }
    };
    return div;
}

// --- ACTIONS ---
function switchCategory(id) {
    currentCategoryId = id;
    selectedItemId = null;
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Klik salah satu entry di tengah</div>`;
    renderAll();
}

function showDetail(id) {
    selectedItemId = id;
    const item = findItem(id);
    if (!item) return;

    document.querySelectorAll('.entry-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
    
    document.getElementById('detailContent').innerHTML = `
        <h2 class="detail-title">${item.t}</h2>
        ${item.u ? `<a href="${item.u.startsWith('http') ? item.u : 'https://'+item.u}" target="_blank" class="detail-link" style="color:var(--accent);display:block;margin:10px 0;">🔗 Kunjungi Link</a>` : ''}
        <div style="font-size:12px; margin-bottom:10px; opacity:0.7;">Reset: ${item.r || 'None'}</div>
        <div class="detail-note" style="white-space:pre-wrap; background:#0e0e11; padding:12px; border-radius:4px; border-left:3px solid var(--accent);">${item.n || 'Tidak ada catatan.'}</div>
    `;
}

function openEntryModal(itemId = null) {
    activeItemId = itemId;
    const modal = document.getElementById('entryModal');
    
    document.getElementById('inpT').value = '';
    document.getElementById('inpU').value = '';
    document.getElementById('inpN').value = '';
    document.getElementById('inpReset').value = 'checklist';

    if (itemId) {
        const item = findItem(itemId);
        if (item) {
            document.getElementById('inpT').value = item.t || '';
            document.getElementById('inpU').value = item.u || '';
            document.getElementById('inpN').value = item.n || '';
            document.getElementById('inpReset').value = item.r && item.r.startsWith('clock:') ? 'custom' : (item.r || 'checklist');
        }
    }
    modal.style.display = 'flex';
}

function handleSaveEntry() {
    const title = document.getElementById('inpT').value.trim();
    if (!title) return alert("Title required!");

    const url = document.getElementById('inpU').value.trim();
    const note = document.getElementById('inpN').value.trim();
    let resetType = document.getElementById('inpReset').value;
    
    if (resetType === 'custom') {
        const time = document.getElementById('inpCustomTime').value;
        resetType = time ? 'clock:' + time : 'daily';
    }

    const cat = dashboardData.find(c => c.id === currentCategoryId);
    
    if (activeItemId) {
        const item = findItem(activeItemId);
        if (item) {
            item.t = title; item.u = url; item.n = note; item.r = resetType;
        }
    } else {
        cat.items.push({ id: Date.now().toString(36), t: title, u: url, n: note, r: resetType, lc: 0, c: false });
    }

    saveData();
    closeModal('entryModal');
    renderEntries(currentCategoryId);
    if (activeItemId) showDetail(activeItemId);
    activeItemId = null;
}

function toggleCheck(itemId, e) {
    e.stopPropagation();
    const item = findItem(itemId);
    if (!item) return;
    item.c = !item.c;
    item.lc = item.c ? Date.now() : 0;
    saveData();
    renderEntries(currentCategoryId);
}

// --- UTILS ---
function findItem(id) {
    for (let cat of dashboardData) {
        const found = cat.items.find(i => i.id === id);
        if (found) return found;
    }
    return null;
}

function getResetRemaining(item) {
    if (!item.r || item.r === 'checklist' || !item.lc) return Infinity;
    const now = Date.now();
    const last = parseInt(item.lc);

    if (item.r.startsWith('clock:')) {
        const [h, m] = item.r.substring(6).split(':').map(Number);
        let resetTime = new Date();
        resetTime.setHours(h, m, 0, 0);
        if (resetTime <= now) resetTime.setDate(resetTime.getDate() + 1);
        return resetTime.getTime() - now;
    }

    const durations = { daily: 86400000, weekly: 604800000, monthly: 2592000000 };
    return (last + (durations[item.r] || 0)) - now;
}

function updateAllCountdowns() {
    let needsSave = false;
    dashboardData.forEach(cat => {
        cat.items.forEach(item => {
            if (!item.c || !item.r || item.r === 'checklist') return;
            const rem = getResetRemaining(item);
            
            if (rem <= 0) { 
                item.c = false; item.lc = 0; needsSave = true; 
            }
            
            const el = document.querySelector(`.countdown[data-id="${item.id}"]`);
            if (el && rem > 0) {
                const h = Math.floor(rem/3600000).toString().padStart(2,'0');
                const m = Math.floor((rem%3600000)/60000).toString().padStart(2,'0');
                const s = Math.floor((rem%60000)/1000).toString().padStart(2,'0');
                el.innerText = `${h}:${m}:${s}`;
            }
        });
    });
    if (needsSave) { saveData(); renderEntries(currentCategoryId); }
}

// --- GLOBAL EXPORTS ---
window.editCurrentItem = () => { if (selectedItemId) openEntryModal(selectedItemId); };
window.deleteCurrentItem = () => {
    if (!selectedItemId || !confirm("Delete item ini?")) return;
    dashboardData.forEach(cat => cat.items = cat.items.filter(i => i.id !== selectedItemId));
    selectedItemId = null;
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Klik salah satu entry di tengah</div>`;
    saveData();
    renderAll();
};
window.openEntryModal = openEntryModal;
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openCatModal = () => document.getElementById('catModal').style.display = 'flex';
window.submitCat = () => {
    const n = document.getElementById('inpCatName').value.trim();
    if (!n) return;
    dashboardData.push({ id: Date.now().toString(), title: n, items: [] });
    saveData();
    window.closeModal('catModal');
    document.getElementById('inpCatName').value = '';
    renderAll();
};
window.handleSearch = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.entry-item').forEach(el => {
        const title = el.querySelector('.item-title').innerText.toLowerCase();
        el.style.display = title.includes(q) ? 'flex' : 'none';
    });
};