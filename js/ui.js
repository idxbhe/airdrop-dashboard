// js/ui.js
import { 
    dashboardData, currentCategoryId, selectedItemId, isCategoryEditMode, isMarkdownMode,
    categorySortable, entriesSortable, setCategorySortable, setEntriesSortable, 
    saveData, setCurrentCategoryId, setSelectedItemId 
} from './state.js';
import { getFaviconHtml, findItem, getRemainingMs, getNextResetTimestamp } from './utils.js';

// Konfigurasi Marked.js untuk menangani bug newline dengan breaks: true
marked.setOptions({
    breaks: true,
    gfm: true
});

export function renderAll() {
    if (dashboardData.length === 0) {
        dashboardData.push({ id: Date.now().toString(), title: "General", items: [] });
        saveData();
    }

    if (!currentCategoryId || !dashboardData.find(c => c.id === currentCategoryId)) {
        setCurrentCategoryId(dashboardData[0].id);
    }

    renderCategories();
    renderEntries(currentCategoryId);

    if (selectedItemId) showDetail(selectedItemId);
}

export function renderCategories() {
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
            li.style.cursor = "pointer";
            li.onclick = (e) => {
                if (!e.target.closest('button')) window.switchCategory(cat.id);
            };
        } else {
            li.innerHTML = `
                <span style="font-weight:700;">${cat.title}</span>
                <span class="item-count">${cat.items.length}</span>
            `;
            li.onclick = () => window.switchCategory(cat.id);
        }

        ul.appendChild(li);
    });

    initCategoryDropTargets();

    if (categorySortable) {
        try { categorySortable.destroy(); } catch(e) {}
        setCategorySortable(null);
    }

    if (!isCategoryEditMode) {
        setCategorySortable(Sortable.create(ul, {
            animation: 180,
            onEnd: () => {
                const newOrderIds = Array.from(ul.children).map(li => li.dataset.id);
                dashboardData.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                saveData();
            }
        }));
    }
}

export function renderEntries(catId) {
    const cat = dashboardData.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('currentCategoryName').textContent = cat.title;

    const container = document.getElementById('entriesList');
    container.innerHTML = '';

    const sortedItems = [...cat.items].sort((a, b) => getRemainingMs(a) - getRemainingMs(b));

    sortedItems.forEach(item => {
        container.appendChild(createEntryElement(item));
    });

    if (entriesSortable) {
        try { entriesSortable.destroy(); } catch(e) {}
        setEntriesSortable(null);
    }

    setEntriesSortable(Sortable.create(container, {
        animation: 150,
        handle: '.item-title',
        onEnd: () => {
            const newOrderIds = Array.from(container.children).map(el => el.dataset.id);
            cat.items.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
            saveData();
        }
    }));
}

export function createEntryElement(item) {
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

export function showDetail(id) {
    setSelectedItemId(id);
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

    let addedHtml = '';
    const createdAt = item.createdAt || parseInt(item.id, 36);
    if (createdAt) {
        const diffMs = Date.now() - createdAt;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const dayText = days === 0 ? 'Hari ini' : `${days} hari yang lalu`;
        addedHtml = `<div class="detail-meta" style="margin-top: 4px; font-style: italic; opacity: 0.7;">Ditambahkan: ${dayText}</div>`;
    }

    // Mengambil catatan dan memprosesnya sesuai state isMarkdownMode
    let noteHtml = '';
    let fontClass = 'mono-font'; // Default font untuk view
    
    if (item.n) {
        if (isMarkdownMode) {
            noteHtml = marked.parse(item.n);
            fontClass = 'md-font'; // Gunakan font yang lebih baik jika markdown aktif
        } else {
            // Jika markdown mati, render sebagai teks mentah (pre-wrap) dengan font mono
            const safeText = item.n.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            noteHtml = `<div style="white-space: pre-wrap; font-family: inherit;">${safeText}</div>`;
        }
    }

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header-row">
            ${favicon}
            <h2 class="detail-title">${item.t}</h2>
        </div>
        ${addedHtml}
        ${linkHtml}
        ${countdownHtml}
        
        <div class="note-header-controls">
            <span>CATATAN</span>
            <div class="note-buttons">
                <label class="switch-wrapper">
                    <span class="switch-label">MARKDOWN</span>
                    <div class="switch">
                        <input type="checkbox" ${isMarkdownMode ? 'checked' : ''} onchange="toggleMarkdownMode()">
                        <span class="slider"></span>
                    </div>
                </label>
                <button class="btn btn-small btn-accent" onclick="openNoteModal()">OPEN NOTE ⧉</button>
            </div>
        </div>
        
        <div class="detail-note ${fontClass}">${noteHtml}</div>
    `;
}

export function initCategoryDropTargets() {
    const categories = document.querySelectorAll("#categoryList .category-item");
    categories.forEach(cat => {
        cat.addEventListener("dragover", (e) => e.preventDefault());
        cat.addEventListener("drop", (e) => {
            const itemId = e.dataTransfer.getData("entry-id");
            if (itemId) moveItemToCategory(itemId, cat.dataset.id);
        });
    });
}

export function moveItemToCategory(itemId, newCatId) {
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

export function initResizable() {
    const resizer = document.querySelector('.resizer');
    const detailPanel = document.querySelector('.detail-panel');
    if (!resizer || !detailPanel) return;

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
            localStorage.setItem('detail_panel_width', detailPanel.offsetWidth);
        }
    });
}

export function updateAllCountdowns() {
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