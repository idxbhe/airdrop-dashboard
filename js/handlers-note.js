// js/handlers-note.js
import { isMarkdownMode, selectedItemId, setIsMarkdownMode, saveData } from './state.js';
import { findItem } from './utils.js';
import { showDetail } from './ui-detail.js';

export function toggleMarkdownMode() {
    setIsMarkdownMode(!isMarkdownMode);
    if (selectedItemId) {
        showDetail(selectedItemId);
    }
}

export function openNoteModal() {
    if (!selectedItemId) return;
    const item = findItem(selectedItemId);
    if (!item) return;

    const modal = document.getElementById('noteModal');
    const titleEl = document.getElementById('noteModalTitle');
    const viewArea = document.getElementById('noteViewArea');
    const editArea = document.getElementById('noteEditArea');
    const controls = document.getElementById('noteEditControls');
    const toggleBtn = document.getElementById('btnToggleNoteEdit');

    if (titleEl) {
        titleEl.textContent = `NOTES [${item.t}]`;
    }

    editArea.value = item.n || '';

    viewArea.classList.remove('mono-font', 'md-font');
    viewArea.classList.add(isMarkdownMode ? 'md-font' : 'mono-font');

    if (item.n) {
        if (isMarkdownMode) {
            viewArea.innerHTML = marked.parse(item.n);
        } else {
            const safeText = item.n.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            viewArea.innerHTML = `<div style="white-space: pre-wrap; font-family: inherit;">${safeText}</div>`;
        }
    } else {
        viewArea.innerHTML = '<div class="empty-state">No notes available.</div>';
    }

    viewArea.style.display = 'block';
    editArea.style.display = 'none';
    controls.style.display = 'none';
    toggleBtn.style.display = 'inline-block';
    toggleBtn.textContent = '✏️ Edit Mode';

    modal.style.display = 'flex';
}

export function toggleNoteEdit() {
    const viewArea = document.getElementById('noteViewArea');
    const editArea = document.getElementById('noteEditArea');
    const controls = document.getElementById('noteEditControls');
    const toggleBtn = document.getElementById('btnToggleNoteEdit');

    const isEditing = editArea.style.display === 'block';

    if (isEditing) {
        viewArea.style.display = 'block';
        editArea.style.display = 'none';
        controls.style.display = 'none';
        toggleBtn.style.display = 'inline-block';
    } else {
        viewArea.style.display = 'none';
        editArea.style.display = 'block';
        controls.style.display = 'flex';
        toggleBtn.style.display = 'none';
    }
}

export function saveNoteFromModal() {
    if (!selectedItemId) return;
    const item = findItem(selectedItemId);
    if (!item) return;

    const editArea = document.getElementById('noteEditArea');
    item.n = editArea.value;

    saveData();
    showDetail(selectedItemId);
    openNoteModal();
}