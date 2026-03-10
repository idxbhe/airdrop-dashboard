// js/ui-entry.js
import { 
    dashboardData, selectedItemId, entriesSortable, 
    setEntriesSortable, saveData 
} from './state.js';
import { getFaviconHtml, getRemainingMs } from './utils.js';
import { showDetail } from './ui-detail.js';

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