import { startLoadingProcess } from './state.js';
import { initResizable, updateAllCountdowns, renderAll } from './ui.js';
import { copyToClipboard } from './utils.js';
import { 
    switchCategory, toggleCheck, toggleCategoryEditMode, 
    editCategory, deleteCategory, openEntryModal, 
    handleSaveEntry, handleResetTypeChange, editCurrentItem, 
    deleteCurrentItem, openCatModal, submitCat, 
    handleSearch, closeModal 
} from './handlers.js';

document.addEventListener('DOMContentLoaded', () => {
    startLoadingProcess(() => {
        renderAll();
    });
    
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

// Global bindings for inline HTML event handlers (onclick, onchange, dll)
window.switchCategory = switchCategory;
window.toggleCheck = toggleCheck;
window.toggleCategoryEditMode = toggleCategoryEditMode;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openEntryModal = openEntryModal;
window.handleSaveEntry = handleSaveEntry;
window.handleResetTypeChange = handleResetTypeChange;
window.editCurrentItem = editCurrentItem;
window.deleteCurrentItem = deleteCurrentItem;
window.openCatModal = openCatModal;
window.submitCat = submitCat;
window.handleSearch = handleSearch;
window.closeModal = closeModal;
window.copyToClipboard = copyToClipboard;