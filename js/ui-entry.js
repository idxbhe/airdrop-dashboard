// js/ui-entry.js
import { 
    dashboardData, selectedItemId, entriesSortable, 
    setEntriesSortable, saveData 
} from './state.js';
import { getFaviconHtml, getRemainingMs } from './utils.js';
import { showDetail } from './ui-detail.js';

export function renderEntries(catId) {
    let cat;
    let isFilterView = false;
    let isQuickNoteView = false;

    if (catId && catId.startsWith('filter_')) {
        isFilterView = true;
        const statusMap = {
            'filter_eligable': 'ELIGABLE',
            'filter_not_eligable': 'NOT ELIGABLE',
            'filter_abandoned': 'ABANDONED'
        };
        const targetStatus = statusMap[catId];
        
        let filteredItems = [];
        dashboardData.forEach(c => {
            c.items.forEach(item => {
                if (item.s === targetStatus) {
                    filteredItems.push(item);
                }
            });
        });

        cat = { id: catId, title: targetStatus, items: filteredItems };
    } else if (catId === 'CAT_QUICK_NOTES') {
        isQuickNoteView = true;
        cat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
    } else {
        cat = dashboardData.find(c => c.id === catId);
    }

    if (!cat) return;

    document.getElementById('currentCategoryName').textContent = cat.title;

    const headerActions = document.querySelector('.panel-header div');
    if (headerActions) {
        if (isQuickNoteView) {
            headerActions.style.display = 'flex';
            headerActions.innerHTML = `
                <button class="btn btn-accent btn-small" onclick="openQuickNoteModal()">➕ ADD QUICK NOTE</button>
            `;
        } else if (isFilterView) {
            headerActions.style.display = 'none';
        } else {
            headerActions.style.display = 'flex';
            headerActions.innerHTML = `
                <button class="btn btn-small" onclick="removeDuplicates()" title="Remove duplicates in this category">🧹 REMOVE DUPLICATES</button>
                <button class="btn btn-accent btn-small" onclick="openEntryModal()">➕ ADD ENTRY</button>
            `;
        }
    }

    const container = document.getElementById('entriesList');
    container.innerHTML = '';

    if (isQuickNoteView) {
        cat.items.forEach(note => {
            container.appendChild(createQuickNoteElement(note));
        });
    } else {
        const sortedItems = [...cat.items].sort((a, b) => getRemainingMs(a) - getRemainingMs(b));
        sortedItems.forEach(item => {
            container.appendChild(createEntryElement(item));
        });
    }

    if (entriesSortable) {
        try { entriesSortable.destroy(); } catch(e) {}
        setEntriesSortable(null);
    }

    if (!isFilterView) {
        setEntriesSortable(Sortable.create(container, {
            animation: 150,
            handle: isQuickNoteView ? '.entry-main' : '.item-title',
            onEnd: () => {
                const newOrderIds = Array.from(container.children).map(el => el.dataset.id);
                cat.items.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                saveData();
            }
        }));
    }
}

export function createQuickNoteElement(note) {
    const div = document.createElement('div');
    div.className = `entry-item`;
    div.dataset.id = note.id;

    let fullNote = note.n || '';
    let displayNote = fullNote;
    if (displayNote.length > 80) {
        displayNote = displayNote.substring(0, 50) + '...' + displayNote.substring(displayNote.length - 25);
    }
    displayNote = displayNote.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, ' ');

    div.innerHTML = `
        <div class="entry-main" style="cursor: pointer;">
            <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                ${note.t ? `<span style="font-size: 10px; font-weight: 700; color: var(--accent);">${note.t}</span>` : ''}
                <span style="font-family: monospace; font-size: 12px; color: var(--text);">${displayNote}</span>
            </div>
            <div class="entry-right" style="gap: 8px;">
                <button onclick="copyQuickNote('${note.id}', event)" class="list-open-btn" style="padding: 4px 8px;">📋 Copy</button>
                <button onclick="editQuickNote('${note.id}', event)" class="list-open-btn" style="padding: 4px 8px;">✏️ Edit</button>
                <button onclick="deleteQuickNote('${note.id}', event)" class="list-open-btn text-danger" style="padding: 4px 8px; border-color: rgba(220, 53, 69, 0.2);">🗑️</button>
            </div>
        </div>
    `;

    div.onclick = () => window.editQuickNote(note.id);

    return div;
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

    const itemStatus = item.s || 'UNKNOWN';
    let statusClass = 'status-unknown';
    if (itemStatus === 'ELIGABLE') statusClass = 'status-eligable';
    else if (itemStatus === 'NOT ELIGABLE') statusClass = 'status-not-eligable';
    else if (itemStatus === 'ABANDONED') statusClass = 'status-abandoned';

    const badgeHtml = itemStatus !== 'UNKNOWN' ? `<div class="status-badge-list ${statusClass}">
        <span class="status-val">${itemStatus}</span>
    </div>` : '';

    let statusHtml = badgeHtml;
    if (hasReset) {
        if (item.c) {
            statusHtml += `
                <div class="reset-box">
                    <span class="reset-label">RESET IN</span>
                    <span class="countdown" data-id="${item.id}">--:--:--</span>
                </div>
            `;
        } else {
            statusHtml += `<span class="ready-text">Ready to complete</span>`;
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
                       class="list-open-btn" 
                       onclick="event.stopPropagation()">Open ↗</a>
                ` : ''}
                ${checkboxHtml}
            </div>
        </div>
    `;

    div.onclick = (e) => {
        if (!e.target.closest('.chk-box') && !e.target.closest('.list-open-btn')) {
            showDetail(item.id);
        }
    };

    return div;
}