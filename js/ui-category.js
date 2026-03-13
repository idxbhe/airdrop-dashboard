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
        li.className = `category-item ${cat.id === currentCategoryId ? 'active' : ''}`;
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