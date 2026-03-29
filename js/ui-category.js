// js/ui-category.js
import { 
    dashboardData, currentCategoryId, isCategoryEditMode, 
    categorySortable, setCategorySortable, saveData 
} from './state.js';
import { renderAll } from './ui-core.js';

export function renderCategories() {
    const ul = document.getElementById('categoryList');
    ul.innerHTML = '';

    dashboardData.forEach(cat => {
        if (cat.id === 'CAT_QUICK_NOTES') return;

        const li = document.createElement('li');
        li.className = `category-item real-category ${cat.id === currentCategoryId ? 'active' : ''}`;
        li.dataset.id = cat.id;

        if (isCategoryEditMode) {
            li.innerHTML = `
                <span class="category-item-title" style="flex:1;">${cat.title}</span>
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
                <span class="category-item-title" title="${cat.title}">${cat.title}</span>
                <span class="item-count">${cat.items.length}</span>
            `;
            li.onclick = () => window.switchCategory(cat.id);
        }

        ul.appendChild(li);
    });

    // Add Divider as an li element
    const dividerLi = document.createElement('li');
    dividerLi.style.listStyle = 'none';
    dividerLi.innerHTML = `
        <div style="margin-top: 8px; border-top: 1px solid var(--border); padding: 12px 16px 4px 16px; font-size: 11px; font-weight: 700; color: var(--text-dim); letter-spacing: 1px;">
            FILTERS
        </div>
    `;
    ul.appendChild(dividerLi);

    // Calculate virtual category counts
    let countEligable = 0;
    let countNotEligable = 0;
    let countAbandoned = 0;

    dashboardData.forEach(cat => {
        cat.items.forEach(item => {
            if (item.s === 'ELIGABLE') countEligable++;
            if (item.s === 'NOT ELIGABLE') countNotEligable++;
            if (item.s === 'ABANDONED') countAbandoned++;
        });
    });

    const virtualCats = [
        { id: 'filter_eligable', title: 'ELIGABLE', count: countEligable, color: '#28a745' },
        { id: 'filter_not_eligable', title: 'NOT ELIGABLE', count: countNotEligable, color: '#dc3545' },
        { id: 'filter_abandoned', title: 'ABANDONED', count: countAbandoned, color: '#ffc107' }
    ];

    const filterLi = document.createElement('li');
    filterLi.style.listStyle = 'none';
    filterLi.style.padding = '4px 16px 12px 16px';
    
    const isFilterActive = currentCategoryId && currentCategoryId.startsWith('filter_');
    
    let selectHtml = `
        <div style="position: relative;">
            <select class="filter-dropdown" style="width: 100%; background: #1a1a1d; border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 6px; outline: none; cursor: pointer; appearance: none; font-weight: 600; font-size: 11px; transition: border 0.2s;">
                <option value="" ${!isFilterActive ? 'selected' : ''} disabled>-- Choose Filter --</option>
    `;
    
    virtualCats.forEach(vCat => {
        const selected = currentCategoryId === vCat.id ? 'selected' : '';
        selectHtml += `<option value="${vCat.id}" ${selected}>${vCat.title} (${vCat.count})</option>`;
    });
    
    selectHtml += `
            </select>
            <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 10px; color: var(--text-dim);">▼</div>
        </div>
    `;
    
    filterLi.innerHTML = selectHtml;
    
    const selectEl = filterLi.querySelector('select');
    selectEl.addEventListener('focus', () => selectEl.style.borderColor = 'var(--accent)');
    selectEl.addEventListener('blur', () => selectEl.style.borderColor = 'var(--border)');
    selectEl.addEventListener('change', (e) => {
        if (e.target.value) {
            window.switchCategory(e.target.value);
        }
    });
    
    if (isCategoryEditMode) {
        filterLi.style.opacity = '0.5';
        selectEl.disabled = true;
    }
    
    ul.appendChild(filterLi);

    // QUICK NOTES
    const qnDivider = document.createElement('li');
    qnDivider.style.listStyle = 'none';
    qnDivider.innerHTML = `
        <div style="margin-top: 8px; border-top: 1px solid var(--border); padding: 12px 16px 4px 16px; font-size: 11px; font-weight: 700; color: var(--text-dim); letter-spacing: 1px;">
            MISC
        </div>
    `;
    ul.appendChild(qnDivider);

    let qnCat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
    if (qnCat) {
        const li = document.createElement('li');
        li.className = `category-item ${qnCat.id === currentCategoryId ? 'active' : ''}`;
        li.dataset.id = qnCat.id;
        li.innerHTML = `
            <span class="category-item-title" title="${qnCat.title}">${qnCat.title}</span>
            <span class="item-count">${qnCat.items.length}</span>
        `;
        li.onclick = () => window.switchCategory(qnCat.id);
        ul.appendChild(li);
    }

    initCategoryDropTargets();

    if (categorySortable) {
        try { categorySortable.destroy(); } catch(e) {}
        setCategorySortable(null);
    }

    if (!isCategoryEditMode) {
        setCategorySortable(Sortable.create(ul, {
            animation: 180,
            draggable: '.real-category', // Only sort real categories
            onEnd: () => {
                // Ensure we only get IDs of real categories
                const newOrderIds = Array.from(ul.children)
                    .filter(li => li.classList.contains('real-category'))
                    .map(li => li.dataset.id);
                
                dashboardData.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                saveData();
            }
        }));
    }
}

export function initCategoryDropTargets() {
    const categories = document.querySelectorAll("#categoryList .real-category");
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