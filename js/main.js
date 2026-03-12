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

// Global handler untuk fallback favicon bertingkat
window.handleFaviconError = function(img) {
    const domain = img.getAttribute('data-domain');
    let step = parseInt(img.getAttribute('data-step') || '1', 10);
    step++;
    img.setAttribute('data-step', step.toString());

    if (step === 2) {
        img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } else if (step === 3) {
        img.src = `https://api.faviconkit.com/${domain}/64`;
    } else if (step === 4) {
        img.src = `https://icon.horse/icon/${domain}`;
    } else if (step === 5) {
        img.src = `https://logo.clearbit.com/${domain}`;
    } else if (step === 6) {
        img.src = `https://cdn-icons-png.flaticon.com/512/3272/3272605.png`;
    } else {
        img.style.display = 'none'; // Sembunyikan jika semua source gagal
    }
};