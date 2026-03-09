// ==================== AIRDROP_TERMINAL v16.5 ====================

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let dashboardData = [];
let currentCategoryId = null;
let selectedItemId = null;
let activeItemId = null;
let isSyncing = false;
let isCategoryEditMode = false;

let categorySortable = null;
let entriesSortable = null;

document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess();
    setInterval(updateAllCountdowns, 1000);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    const urlInput = document.getElementById('inpU');
    if (urlInput) {
        urlInput.addEventListener('blur', () => {
            let val = urlInput.value.trim();
            if (val && !/^https?:\/\//i.test(val)) {
                urlInput.value = 'https://' + val;
            }
        });
    }

    initResizable();
});

// ==================== DATA & SYNC ====================

function startLoadingProcess() {
    const local = localStorage.getItem('airdrop_terminal_data');
    if (local) {
        try {
            dashboardData = JSON.parse(local);
            repairData();
            renderAll();
        } catch (e) {}
    }

    db.ref('dashboard_data').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            dashboardData = snapshot.val();
            repairData();
            saveLocal();
            renderAll();
        }

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
        setTimeout(() => { isSyncing = false; }, 500);
    });
}

// ==================== RESIZABLE DETAIL PANEL + REMEMBER SIZE ====================

function initResizable() {
    const resizer = document.querySelector('.resizer');
    const detailPanel = document.querySelector('.detail-panel');
    if (!resizer || !detailPanel) return;

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('detail_panel_width');
    if (savedWidth) {
        detailPanel.style.width = `${savedWidth}px`;
        detailPanel.style.flex = 'none';
    }

    let isDragging = false;
    let startX, startWidth;

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startWidth = detailPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = startX - e.clientX;
        let newWidth = Math.max(280, Math.min(startWidth + delta, window.innerWidth - 420));
        detailPanel.style.width = `${newWidth}px`;
        detailPanel.style.flex = 'none';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
            // Save new width to localStorage
            localStorage.setItem('detail_panel_width', detailPanel.offsetWidth);
        }
    });
}

// ==================== RENDER ====================

function renderAll() {
    if (dashboardData.length === 0) {
        dashboardData = [{ id: Date.now().toString(), title: "General", items: [] }];
        saveData();
    }

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
        li.dataset.id = cat.id;

        if (isCategoryEditMode) {
            li.innerHTML = `
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;font-weight:700;">${cat.title}</span>
                <div style="display:flex;gap:6px;">
                    <button onclick="editCategory('${cat.id}',event)">✏️</button>
                    <button onclick="deleteCategory('${cat.id}',event)">🗑️</button>
                </div>
            `;
            li.style.cursor = "default";
        } else {
            li.innerHTML = `
                <span style="font-weight:700;">${cat.title}</span>
                <span class="item-count">${cat.items.length}</span>
            `;
            li.onclick = () => switchCategory(cat.id);
        }

        ul.appendChild(li);
    });

    initCategoryDropTargets();

    if (categorySortable) categorySortable.destroy();

    if (!isCategoryEditMode) {
        categorySortable = Sortable.create(ul, {
            animation: 180,
            onEnd: () => {
                const newOrderIds = Array.from(ul.children).map(li => li.dataset.id);
                dashboardData.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                saveData();
            }
        });
    }
}

function renderEntries(catId) {
    const cat = dashboardData.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('currentCategoryName').textContent = cat.title;

    const container = document.getElementById('entriesList');
    container.innerHTML = '';

    const sortedItems = [...cat.items].sort((a, b) => getRemainingMs(a) - getRemainingMs(b));

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

// ==================== MULTI-SOURCE FAVICON ====================

function getFaviconHtml(u) {
    if (!u) return '';
    try {
        const domain = new URL(u.startsWith('http') ? u : 'https://' + u).hostname;
        return `
            <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" 
                 class="entry-icon" 
                 onerror="this.src='https://icons.duckduckgo.com/ip3/${domain}.ico'; 
                          this.onerror=function(){this.src='https://api.faviconkit.com/${domain}/64'; 
                          this.onerror=function(){this.style.display='none';}}">
        `;
    } catch (e) {
        return '';
    }
}

// ==================== ENTRY ELEMENT ====================

function createEntryElement(item) {
    const div = document.createElement('div');
    div.className = `entry-item ${item.id === selectedItemId ? 'active' : ''} ${!item.c && item.r !== 'none' ? 'pending' : ''}`;
    div.dataset.id = item.id;
    div.draggable = true;

    div.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("entry-id", item.id);
    });

    const favicon = getFaviconHtml(item.u);

    const isNone = item.r === 'none';
    const hasReset = item.r && item.r !== 'checklist' && !isNone;

    let statusHtml = '';
    if (hasReset) {
        if (item.c) {
            statusHtml = `
                <div class="reset-box">
                    <span class="reset-label">RESET IN</span>
                    <span class="countdown" data-id="${item.id}">--:--:--</span>
                </div>
            `;
        } else {
            statusHtml = `<span class="ready-text">READY TO COMPLETE</span>`;
        }
    }

    const checkboxHtml = !isNone ? `
        <input type="checkbox" class="chk-box" ${item.c ? 'checked' : ''} onclick="toggleCheck('${item.id}',event)">
    ` : '';

    div.innerHTML = `
        <div class="entry-main">
            ${favicon}
            <span class="item-title">${item.t || 'Untitled'}</span>

            <div class="entry-right">
                ${statusHtml}
                ${item.u ? `
                    <a href="${item.u.startsWith('http') ? item.u : 'https://' + item.u}" 
                       target="_blank" 
                       class="btn-open-link btn" 
                       onclick="event.stopPropagation()">Open ↗</a>
                ` : ''}
                ${checkboxHtml}
            </div>
        </div>
    `;

    div.onclick = (e) => {
        if (!e.target.closest('.chk-box') && !e.target.closest('.btn-open-link')) {
            showDetail(item.id);
        }
    };

    return div;
}

// ==================== DRAG & DROP ====================

function initCategoryDropTargets() {
    const categories = document.querySelectorAll("#categoryList .category-item");
    categories.forEach(cat => {
        cat.addEventListener("dragover", (e) => e.preventDefault());
        cat.addEventListener("drop", (e) => {
            const itemId = e.dataTransfer.getData("entry-id");
            if (itemId) moveItemToCategory(itemId, cat.dataset.id);
        });
    });
}

function moveItemToCategory(itemId, newCatId) {
    let item = null;
    dashboardData.forEach(cat => {
        const index = cat.items.findIndex(i => i.id === itemId);
        if (index > -1) item = cat.items.splice(index, 1)[0];
    });
    if (!item) return;
    const target = dashboardData.find(c => c.id === newCatId);
    if (target) target.items.push(item);
    saveData();
    renderAll();
}

// ==================== ENTRY MODAL ====================

function openEntryModal(itemId = null) {
    activeItemId = itemId;
    const modal = document.getElementById('entryModal');

    document.getElementById('inpT').value = '';
    document.getElementById('inpU').value = '';
    document.getElementById('inpN').value = '';

    const grid = document.querySelector('.settings-grid');
    grid.innerHTML = ''; // Reset grid

    const chkChecklistDiv = document.createElement('div');
    chkChecklistDiv.innerHTML = `
        <label class="label-tiny">Enable Checklist</label>
        <input type="checkbox" id="enableChecklist" checked>
    `;
    grid.appendChild(chkChecklistDiv);

    const chkResetDiv = document.createElement('div');
    chkResetDiv.innerHTML = `
        <label class="label-tiny">Enable Reset</label>
        <input type="checkbox" id="enableReset">
    `;
    grid.appendChild(chkResetDiv);

    const resetTypeDiv = document.createElement('div');
    resetTypeDiv.id = 'resetTypeWrapper';
    resetTypeDiv.style.display = 'none';
    resetTypeDiv.innerHTML = `
        <label class="label-tiny">Reset Type</label>
        <select id="inpResetType" onchange="handleResetTypeChange()">
            <option value="daily">Daily (24 Jam)</option>
            <option value="weekly">Weekly (7 Days)</option>
            <option value="clock:07:00">Every 07.00 AM</option>
            <option value="monday:07:00">Every Monday (at 07.00 AM)</option>
            <option value="duration">Custom by Time</option>
            <option value="clock">Custom by Clock</option>
            <option value="day">Custom by Day</option>
        </select>
    `;
    grid.appendChild(resetTypeDiv);

    const durWrapper = document.createElement('div');
    durWrapper.id = 'durationWrapper';
    durWrapper.style.display = 'none';
    durWrapper.innerHTML = `
        <label class="label-tiny">Custom Duration</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
            <input type="number" id="durH" min="0" placeholder="Jam">
            <input type="number" id="durM" min="0" max="59" placeholder="Menit">
            <input type="number" id="durS" min="0" max="59" placeholder="Detik">
        </div>
    `;
    grid.appendChild(durWrapper);

    const clockWrapper = document.createElement('div');
    clockWrapper.id = 'clockWrapper';
    clockWrapper.style.display = 'none';
    clockWrapper.innerHTML = `
        <label class="label-tiny">Custom Clock</label>
        <input type="time" id="inpCustomClock">
    `;
    grid.appendChild(clockWrapper);

    const dayWrapper = document.createElement('div');
    dayWrapper.id = 'dayWrapper';
    dayWrapper.style.display = 'none';
    dayWrapper.innerHTML = `
        <label class="label-tiny">Custom Day & Time</label>
        <select id="inpCustomDay">
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
        </select>
        <input type="time" id="inpCustomDayTime">
    `;
    grid.appendChild(dayWrapper);

    const chkReset = document.getElementById('enableReset');
    const chkChecklist = document.getElementById('enableChecklist');
    const resetWrapper = document.getElementById('resetTypeWrapper');

    chkReset.addEventListener('change', () => {
        if (chkReset.checked) {
            chkChecklist.checked = true;
            chkChecklist.disabled = true;
        } else {
            chkChecklist.disabled = false;
        }
        resetWrapper.style.display = chkReset.checked ? 'block' : 'none';
        handleResetTypeChange();
    });

    // Initial state jika edit
    if (itemId) {
        const item = findItem(itemId);
        if (item) {
            document.getElementById('inpT').value = item.t || '';
            document.getElementById('inpU').value = item.u || '';
            document.getElementById('inpN').value = item.n || '';

            const r = item.r || 'checklist';
            chkChecklist.checked = r !== 'none';
            chkReset.checked = r !== 'checklist' && r !== 'none';

            if (chkReset.checked) {
                chkChecklist.disabled = true;
            }

            const selectType = document.getElementById('inpResetType');
            if (r === 'daily') selectType.value = 'daily';
            else if (r === 'weekly') selectType.value = 'weekly';
            else if (r === 'clock:07:00') selectType.value = 'clock:07:00';
            else if (r.startsWith('monday:')) selectType.value = 'monday:07:00';
            else if (r.startsWith('duration:')) {
                selectType.value = 'duration';
                const parts = r.slice(9).split(':').map(n => parseInt(n) || 0);
                document.getElementById('durH').value = parts[0];
                document.getElementById('durM').value = parts[1];
                document.getElementById('durS').value = parts[2];
            } else if (r.startsWith('clock:')) {
                selectType.value = 'clock';
                document.getElementById('inpCustomClock').value = r.substring(6);
            } else if (r.includes(':')) { // day:time
                selectType.value = 'day';
                const [day, time] = r.split(':');
                document.getElementById('inpCustomDay').value = day.toLowerCase();
                document.getElementById('inpCustomDayTime').value = time;
            }
        }
    }

    handleResetTypeChange();
    modal.style.display = 'flex';
}

function handleSaveEntry() {
    const title = document.getElementById('inpT').value.trim();
    if (!title) {
        alert("Title required!");
        return;
    }

    const url = document.getElementById('inpU').value.trim();
    const note = document.getElementById('inpN').value.trim();

    const enableChecklist = document.getElementById('enableChecklist').checked;
    const enableReset = document.getElementById('enableReset').checked;

    let resetType = 'none';
    if (enableChecklist) {
        resetType = 'checklist';
        if (enableReset) {
            const selType = document.getElementById('inpResetType').value;
            if (selType === 'daily') resetType = 'daily';
            else if (selType === 'weekly') resetType = 'weekly';
            else if (selType === 'clock:07:00') resetType = 'clock:07:00';
            else if (selType === 'monday:07:00') resetType = 'monday:07:00';
            else if (selType === 'duration') {
                const h = parseInt(document.getElementById('durH').value) || 0;
                const m = parseInt(document.getElementById('durM').value) || 0;
                const s = parseInt(document.getElementById('durS').value) || 0;
                resetType = (h || m || s) ? `duration:${h}:${m}:${s}` : 'daily';
            } else if (selType === 'clock') {
                const time = document.getElementById('inpCustomClock').value;
                resetType = time ? `clock:${time}` : 'daily';
            } else if (selType === 'day') {
                const day = document.getElementById('inpCustomDay').value;
                const time = document.getElementById('inpCustomDayTime').value;
                resetType = time ? `${day}:${time}` : 'daily';
            }
        }
    }

    const cat = dashboardData.find(c => c.id === currentCategoryId);
    if (!cat) return;

    if (activeItemId) {
        const item = findItem(activeItemId);
        if (item) {
            item.t = title;
            item.u = url;
            item.n = note;
            item.r = resetType;
        }
    } else {
        cat.items.push({
            id: Date.now().toString(36),
            t: title,
            u: url,
            n: note,
            r: resetType,
            lc: 0,
            c: false
        });
    }

    saveData();
    closeModal('entryModal');
    renderEntries(currentCategoryId);
    if (activeItemId) showDetail(activeItemId);
    activeItemId = null;
}

function handleResetTypeChange() {
    const enableReset = document.getElementById('enableReset')?.checked;
    const selType = document.getElementById('inpResetType')?.value;

    const durWrapper = document.getElementById('durationWrapper');
    const clockWrapper = document.getElementById('clockWrapper');
    const dayWrapper = document.getElementById('dayWrapper');
    const resetWrapper = document.getElementById('resetTypeWrapper');

    if (resetWrapper) resetWrapper.style.display = enableReset ? 'block' : 'none';

    if (durWrapper) durWrapper.style.display = (enableReset && selType === 'duration') ? 'block' : 'none';
    if (clockWrapper) clockWrapper.style.display = (enableReset && selType === 'clock') ? 'block' : 'none';
    if (dayWrapper) dayWrapper.style.display = (enableReset && selType === 'day') ? 'block' : 'none';
}

// ==================== BASIC ACTIONS ====================

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

    const favicon = getFaviconHtml(item.u);
    const fullUrl = item.u ? (item.u.startsWith('http') ? item.u : 'https://' + item.u) : '';

    let countdownHtml = '';
    const hasReset = item.r && item.r !== 'checklist' && item.r !== 'none';
    if (hasReset) {
        if (item.c) {
            countdownHtml = `
                <div class="detail-reset-box">
                    <span class="reset-label">RESET IN</span>
                    <span class="countdown-detail" data-id="${item.id}">--:--:--</span>
                </div>
            `;
        } else {
            countdownHtml = `<span class="detail-ready">READY TO COMPLETE</span>`;
        }
    }

    let linkHtml = '';
    if (fullUrl) {
        const truncatedUrl = fullUrl.length > 50 ? fullUrl.substring(0, 40) + '...' + fullUrl.substring(fullUrl.length - 10) : fullUrl;
        linkHtml = `
            <div class="detail-link-box">
                <code class="mono-url">${truncatedUrl}</code>
                <button onclick="copyToClipboard('${fullUrl}')" class="copy-btn">📋</button>
                <a href="${fullUrl}" target="_blank" class="btn-open-link detail-open-btn">Open ↗</a>
            </div>
        `;
    }

    const noteHtml = item.n ? item.n.replace(/^\s+/gm, '').trim() : '';

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header-row">
            ${favicon}
            <h2 class="detail-title">${item.t}</h2>
        </div>

        ${linkHtml}

        ${countdownHtml}

        <div class="detail-note mono-note">
            ${noteHtml}
        </div>
    `;
}

function toggleCheck(itemId, e) {
    e.stopPropagation();
    const item = findItem(itemId);
    if (!item || item.r === 'none') return;

    item.c = !item.c;
    item.lc = item.c ? Date.now() : 0;

    saveData();
    renderEntries(currentCategoryId);

    if (selectedItemId === itemId) {
        showDetail(itemId);
    }
}

// ==================== CATEGORY EDIT/DELETE ====================

function toggleCategoryEditMode() {
    isCategoryEditMode = !isCategoryEditMode;
    renderCategories();
}

function editCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    const cat = dashboardData.find(c => c.id === id);
    if (!cat) return;
    const newTitle = prompt('Rename kategori:', cat.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        cat.title = newTitle.trim();
        saveData();
        renderAll();
    }
}

function deleteCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    const isLast = dashboardData.length === 1;
    if (!confirm(isLast ? 'Ini kategori terakhir. Hapus dan buat "General" baru?' : 'Hapus kategori ini beserta semua entry-nya?')) return;

    if (isLast) {
        dashboardData = [{ id: Date.now().toString(), title: "General", items: [] }];
        currentCategoryId = dashboardData[0].id;
    } else {
        dashboardData = dashboardData.filter(c => c.id !== id);
        if (currentCategoryId === id && dashboardData.length > 0) {
            currentCategoryId = dashboardData[0].id;
        }
    }

    if (selectedItemId && !findItem(selectedItemId)) {
        selectedItemId = null;
        document.getElementById('detailContent').innerHTML = `<div class="empty-state">Pilih entri untuk melihat detail</div>`;
    }

    saveData();
    renderAll();
}

function editCurrentItem() {
    if (!selectedItemId) {
        alert('Pilih entry terlebih dahulu!');
        return;
    }
    openEntryModal(selectedItemId);
}

function deleteCurrentItem() {
    if (!selectedItemId) return;
    if (!confirm('Hapus entry ini?')) return;

    for (let cat of dashboardData) {
        const idx = cat.items.findIndex(i => i.id === selectedItemId);
        if (idx !== -1) {
            cat.items.splice(idx, 1);
            break;
        }
    }
    selectedItemId = null;
    saveData();
    renderAll();
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Pilih entri untuk melihat detail</div>`;
}

// ==================== COUNTDOWN & SORT LOGIC ====================

function getNextResetTimestamp(item) {
    if (!item || !item.r || item.r === 'checklist' || item.r === 'none') return null;

    const base = item.lc > 0 ? item.lc : Date.now();
    const now = Date.now();

    if (item.r === 'daily') return base + 24 * 60 * 60 * 1000;
    if (item.r === 'weekly') return base + 7 * 24 * 60 * 60 * 1000;
    if (item.r === 'monthly') {
        let d = new Date(base);
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    if (item.r.startsWith('clock:')) {
        const [hh, mm] = item.r.slice(6).split(':').map(n => parseInt(n, 10));
        let d = new Date(base);
        d.setHours(hh, mm, 0, 0);
        if (d.getTime() <= base) d.setDate(d.getDate() + 1);
        return d.getTime();
    }
    if (item.r.startsWith('duration:')) {
        const parts = item.r.slice(9).split(':').map(n => parseInt(n) || 0);
        const totalMs = (parts[0] * 3600000) + (parts[1] * 60000) + (parts[2] * 1000);
        return totalMs > 0 ? base + totalMs : null;
    }
    if (item.r.includes(':')) { // day:time
        const [day, time] = item.r.split(':');
        const [hh, mm] = time.split(':').map(n => parseInt(n, 10));
        let d = new Date(base);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(day.toLowerCase());
        let currentDay = d.getDay();
        let daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // next week if same day
        d.setDate(d.getDate() + daysToAdd);
        d.setHours(hh, mm, 0, 0);
        return d.getTime();
    }
    return null;
}

function getRemainingMs(item) {
    if (!item.r || item.r === 'checklist' || item.r === 'none') {
        return item.c ? Infinity : 0;
    }
    if (!item.c) return 0;
    const target = getNextResetTimestamp(item);
    if (!target) return Infinity;
    const rem = target - Date.now();
    return rem > 0 ? rem : 0;
}

function updateAllCountdowns() {
    const now = Date.now();
    let needsRender = false;

    dashboardData.forEach(cat => {
        cat.items.forEach(item => {
            if (item.r && item.r !== 'checklist' && item.r !== 'none' && item.c) {
                const target = getNextResetTimestamp(item);
                if (target && target <= now) {
                    item.c = false;
                    item.lc = 0;
                    needsRender = true;
                }
            }
        });
    });

    if (needsRender) {
        saveData();
        renderEntries(currentCategoryId);
        if (selectedItemId) showDetail(selectedItemId);
        return;
    }

    document.querySelectorAll('.countdown, .countdown-detail').forEach(span => {
        const id = span.dataset.id;
        const item = findItem(id);
        if (!item || !item.c) {
            span.textContent = '00:00:00';
            return;
        }
        const target = getNextResetTimestamp(item);
        if (!target || target <= now) {
            span.textContent = '00:00:00';
            return;
        }
        let remaining = target - now;
        const d = Math.floor(remaining / 86400000);
        remaining %= 86400000;
        const h = Math.floor(remaining / 3600000);
        remaining %= 3600000;
        const m = Math.floor(remaining / 60000);
        remaining %= 60000;
        const s = Math.floor(remaining / 1000);
        if (d > 0) {
            span.textContent = `${d.toString().padStart(1,'0')}:${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        } else {
            span.textContent = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }
    });
}

// ==================== UTILS ====================

function findItem(id) {
    for (let cat of dashboardData) {
        const found = cat.items.find(i => i.id === id);
        if (found) return found;
    }
    return null;
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Link copied to clipboard!');
    });
};

// ==================== GLOBAL BINDINGS ====================

window.openEntryModal = openEntryModal;
window.handleSaveEntry = handleSaveEntry;
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.openCatModal = () => document.getElementById('catModal').style.display = 'flex';
window.submitCat = () => {
    const n = document.getElementById('inpCatName').value.trim();
    if (!n) return;
    dashboardData.push({ id: Date.now().toString(), title: n, items: [] });
    saveData();
    closeModal('catModal');
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

window.toggleCategoryEditMode = toggleCategoryEditMode;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editCurrentItem = editCurrentItem;
window.deleteCurrentItem = deleteCurrentItem;
window.handleResetTypeChange = handleResetTypeChange;