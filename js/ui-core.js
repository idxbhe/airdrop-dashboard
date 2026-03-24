// js/ui-core.js
import { dashboardData, currentCategoryId, selectedItemId, saveData, setCurrentCategoryId } from './state.js';
import { getNextResetTimestamp, findItem, getServerTime } from './utils.js';
import { renderCategories } from './ui-category.js';
import { renderEntries } from './ui-entry.js';
import { showDetail } from './ui-detail.js';

export function renderAll() {
    if (dashboardData.length === 0) {
        dashboardData.push({ id: Date.now().toString(), title: "General", items: [] });
        saveData();
    }

    if (!currentCategoryId || (!dashboardData.find(c => c.id === currentCategoryId) && !currentCategoryId.startsWith('filter_'))) {
        setCurrentCategoryId(dashboardData[0].id);
    }

    renderCategories();
    renderEntries(currentCategoryId);

    if (selectedItemId) showDetail(selectedItemId);
}

export function initResizable() {
    // Detail panel resizer
    const detailResizer = document.querySelector('.resizer:not(#sidebarResizer)');
    const detailPanel = document.querySelector('.detail-panel');
    if (detailResizer && detailPanel) {
        const savedDetailWidth = localStorage.getItem('detail_panel_width');
        if (savedDetailWidth) {
            detailPanel.style.width = `${savedDetailWidth}px`;
            detailPanel.style.flex = 'none';
        }

        let isDraggingDetail = false;
        let startXDetail, startWidthDetail;

        detailResizer.addEventListener('mousedown', (e) => {
            isDraggingDetail = true;
            startXDetail = e.clientX;
            startWidthDetail = detailPanel.offsetWidth;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingDetail) return;
            const delta = startXDetail - e.clientX;
            let newWidth = Math.max(280, Math.min(startWidthDetail + delta, window.innerWidth - 420));
            detailPanel.style.width = `${newWidth}px`;
            detailPanel.style.flex = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingDetail) {
                isDraggingDetail = false;
                document.body.style.cursor = 'default';
                localStorage.setItem('detail_panel_width', detailPanel.offsetWidth);
            }
        });
    }

    // Sidebar resizer
    const sidebarResizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('sidebar');
    if (sidebarResizer && sidebar) {
        const savedSidebarWidth = localStorage.getItem('sidebar_width');
        if (savedSidebarWidth) {
            sidebar.style.width = `${savedSidebarWidth}px`;
            sidebar.style.flex = 'none';
        }

        let isDraggingSidebar = false;
        let startXSidebar, startWidthSidebar;

        sidebarResizer.addEventListener('mousedown', (e) => {
            isDraggingSidebar = true;
            startXSidebar = e.clientX;
            startWidthSidebar = sidebar.offsetWidth;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingSidebar) return;
            const delta = e.clientX - startXSidebar;
            let newWidth = Math.max(150, Math.min(startWidthSidebar + delta, window.innerWidth - 400));
            sidebar.style.width = `${newWidth}px`;
            sidebar.style.flex = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingSidebar) {
                isDraggingSidebar = false;
                document.body.style.cursor = 'default';
                localStorage.setItem('sidebar_width', sidebar.offsetWidth);
            }
        });
    }
}

export function updateAllCountdowns() {
    const now = getServerTime();
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