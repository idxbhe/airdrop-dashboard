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

    virtualCats.forEach(vCat => {
        const li = document.createElement('li');
        li.className = `category-item virtual-category ${vCat.id === currentCategoryId ? 'active' : ''}`;
        li.dataset.id = vCat.id;

        if (isCategoryEditMode) {
            li.innerHTML = `
                <span class="category-item-title" style="flex:1; color: ${vCat.color};">${vCat.title}</span>
            `;
            li.style.cursor = "pointer";
            li.onclick = () => window.switchCategory(vCat.id);
        } else {
            li.innerHTML = `
                <span class="category-item-title" title="${vCat.title}" style="color: ${vCat.color};">${vCat.title}</span>
                <span class="item-count">${vCat.count}</span>
            `;
            li.onclick = () => window.switchCategory(vCat.id);
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