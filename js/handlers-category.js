// js/handlers-category.js
import { 
    dashboardData, currentCategoryId, selectedItemId, isCategoryEditMode,
    setCurrentCategoryId, setSelectedItemId, setIsCategoryEditMode, saveData 
} from './state.js';
import { findItem } from './utils.js';
import { renderAll } from './ui-core.js';
import { renderCategories } from './ui-category.js';
import { closeModal } from './handlers-global.js';

export function switchCategory(id) {
    setCurrentCategoryId(id);
    setSelectedItemId(null);
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Click an entry in the middle</div>`;
    renderAll();
}

export function toggleCategoryEditMode() {
    setIsCategoryEditMode(!isCategoryEditMode);
    renderCategories();
}

export function editCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    const cat = dashboardData.find(c => c.id === id);
    if (!cat) return;
    const newTitle = prompt('Rename category:', cat.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        cat.title = newTitle.trim();
        saveData();
        renderAll();
    }
}

export function deleteCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    const isLast = dashboardData.length === 1;
    if (!confirm(isLast ? 'This is the last category. Delete and create a new "General" category?' : 'Delete this category and all its entries?')) return;

    if (isLast) {
        dashboardData.length = 0;
        dashboardData.push({ id: Date.now().toString(), title: "General", items: [] });
        setCurrentCategoryId(dashboardData[0].id);
    } else {
        const index = dashboardData.findIndex(c => c.id === id);
        if (index > -1) dashboardData.splice(index, 1);
        
        if (currentCategoryId === id && dashboardData.length > 0) {
            setCurrentCategoryId(dashboardData[0].id);
        }
    }

    if (selectedItemId && !findItem(selectedItemId)) {
        setSelectedItemId(null);
        document.getElementById('detailContent').innerHTML = `<div class="empty-state">Select an entry to view details</div>`;
    }

    saveData();
    renderAll();
}

export function openCatModal() {
    document.getElementById('catModal').style.display = 'flex';
}

export function submitCat() {
    const n = document.getElementById('inpCatName').value.trim();
    if (!n) return;
    dashboardData.push({ id: Date.now().toString(), title: n, items: [] });
    saveData();
    closeModal('catModal');
    document.getElementById('inpCatName').value = '';
    renderAll();
}