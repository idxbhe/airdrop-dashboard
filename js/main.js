// js/main.js
import { startLoadingProcess } from './state.js';
import { copyToClipboard } from './utils.js';
import { initResizable, updateAllCountdowns, renderAll } from './ui-core.js';
import { handleSearch, closeModal, exportData, importData } from './handlers-global.js';
import { switchCategory, toggleCategoryEditMode, editCategory, deleteCategory, openCatModal, submitCat } from './handlers-category.js';
import { toggleCheck, openEntryModal, handleSaveEntry, handleResetTypeChange, editCurrentItem, deleteCurrentItem, removeDuplicates } from './handlers-entry.js';
import { toggleMarkdownMode, openNoteModal, toggleNoteEdit, saveNoteFromModal } from './handlers-note.js';
import { initAuth, loginWithGoogle, logout, toggleUserDropdown } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    
    setInterval(updateAllCountdowns, 1000);
    
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    const urlInput = document.getElementById('inpU');
    const titleInput = document.getElementById('inpT');
    if (urlInput) {
        urlInput.addEventListener('blur', async () => {
            let val = urlInput.value.trim();
            if (val && !/^https?:\/\//i.test(val)) {
                val = 'https://' + val;
                urlInput.value = val;
            }
            // Auto-detect title if title input is empty
            if (val && titleInput && !titleInput.value.trim()) {
                titleInput.placeholder = "Loading title...";
                try {
                    const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(val)}`);
                    const json = await response.json();
                    if (json.status === 'success' && json.data && json.data.title && !titleInput.value.trim()) {
                        titleInput.value = json.data.title;
                    }
                } catch (e) {
                    console.error("Failed to auto-detect title:", e);
                } finally {
                    titleInput.placeholder = "Title / Task Name";
                }
            }
        });
    }

    initResizable();
});

// Global bindings for inline HTML event handlers (onclick, onchange, dll)
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.toggleUserDropdown = toggleUserDropdown;
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
window.removeDuplicates = removeDuplicates;
window.openCatModal = openCatModal;
window.submitCat = submitCat;
window.handleSearch = handleSearch;
window.closeModal = closeModal;
window.copyToClipboard = copyToClipboard;
window.exportData = exportData;
window.importData = importData;

// Global bindings fitur catatan baru
window.toggleMarkdownMode = toggleMarkdownMode;
window.openNoteModal = openNoteModal;
window.toggleNoteEdit = toggleNoteEdit;
window.saveNoteFromModal = saveNoteFromModal;