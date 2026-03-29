// js/handlers-category.js
import { 
    dashboardData, currentCategoryId, selectedItemId, isCategoryEditMode,
    setCurrentCategoryId, setSelectedItemId, setIsCategoryEditMode, saveData 
} from './state.js';
import { findItem } from './utils.js';
import { renderAll } from './ui-core.js';
import { renderCategories } from './ui-category.js';
import { closeModal } from './handlers-global.js';
import { customConfirm, customPrompt } from './ui-dialog.js';

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

export async function editCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    if (id === 'CAT_QUICK_NOTES') return; // Cannot rename Quick Notes
    const cat = dashboardData.find(c => c.id === id);
    if (!cat) return;
    const newTitle = await customPrompt('Rename category:', cat.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        cat.title = newTitle.trim();
        saveData();
        renderAll();
    }
}

export async function deleteCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    if (id === 'CAT_QUICK_NOTES') return; // Cannot delete Quick Notes
    const isLast = dashboardData.length <= 2; // Quick Notes is always there, so if 2 or less, it's effectively the last real category
    const confirmed = await customConfirm('Delete this category and all its entries?', 'Confirmation', true);
    if (!confirmed) return;

    const index = dashboardData.findIndex(c => c.id === id);
    if (index > -1) {
        dashboardData.splice(index, 1);
        
        // If we deleted the current category, switch to the first available one
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