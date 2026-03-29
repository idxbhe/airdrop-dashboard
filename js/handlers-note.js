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

export function toggleInlineNoteEdit() {
    const viewArea = document.getElementById('inlineNoteViewArea');
    const editContainer = document.getElementById('inlineNoteEditContainer');
    const toggleBtn = document.getElementById('btnInlineNoteEdit');

    const isEditing = editContainer.style.display === 'block';

    if (isEditing) {
        viewArea.style.display = 'block';
        editContainer.style.display = 'none';
        toggleBtn.textContent = '✏️';
        toggleBtn.title = 'Edit Note';
    } else {
        viewArea.style.display = 'none';
        editContainer.style.display = 'block';
        toggleBtn.textContent = '✖️';
        toggleBtn.title = 'Cancel Edit';
    }
}

export function saveInlineNote(id) {
    const item = findItem(id);
    if (!item) return;

    const editArea = document.getElementById('inlineNoteEditArea');
    item.n = editArea.value;

    saveData();
    showDetail(id);
}

export function handleStatusChange(id, newStatus) {
    import('./state.js').then(({ currentCategoryId, saveData }) => {
        const item = findItem(id);
        if (!item) return;

        item.s = newStatus;
        saveData();
        
        import('./ui-entry.js').then(({ renderEntries }) => {
            renderEntries(currentCategoryId);
        });
        import('./ui-category.js').then(({ renderCategories }) => {
            renderCategories();
        });
        import('./ui-detail.js').then(({ showDetail }) => {
            showDetail(id);
        });
    });
}

// QUICK NOTES
export function openQuickNoteModal(id = null) {
    const qnIdInput = document.getElementById('qnId');
    const qnTitleInput = document.getElementById('qnTitle');
    const qnContentInput = document.getElementById('qnContent');
    
    if (qnIdInput) qnIdInput.value = id || '';
    if (qnTitleInput) qnTitleInput.value = '';
    if (qnContentInput) qnContentInput.value = '';

    if (id) {
        import('./state.js').then(({ dashboardData }) => {
            const qnCat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
            if (qnCat) {
                const note = qnCat.items.find(n => n.id === id);
                if (note) {
                    if (qnTitleInput) qnTitleInput.value = note.t || '';
                    if (qnContentInput) qnContentInput.value = note.n || '';
                }
            }
        });
    }

    const modal = document.getElementById('quickNoteModal');
    if (modal) modal.style.display = 'flex';
}

export function saveQuickNote() {
    const id = document.getElementById('qnId').value;
    const title = document.getElementById('qnTitle').value.trim();
    const content = document.getElementById('qnContent').value.trim();

    if (!content) {
        import('./ui-dialog.js').then(({ customAlert }) => {
            customAlert('Note content cannot be empty.');
        });
        return;
    }

    import('./state.js').then(({ dashboardData, saveData, currentCategoryId }) => {
        let qnCat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
        if (!qnCat) {
            qnCat = { id: 'CAT_QUICK_NOTES', title: 'QUICK NOTES', items: [] };
            dashboardData.push(qnCat);
        }

        if (id) {
            const note = qnCat.items.find(n => n.id === id);
            if (note) {
                note.t = title;
                note.n = content;
            }
        } else {
            qnCat.items.push({
                id: 'qn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                t: title,
                n: content
            });
        }

        saveData();
        const modal = document.getElementById('quickNoteModal');
        if (modal) modal.style.display = 'none';
        
        // Refresh UI
        import('./ui-core.js').then(({ renderAll }) => {
            renderAll();
        });
    });
}

export function editQuickNote(id, e) {
    if (e) e.stopPropagation();
    openQuickNoteModal(id);
}

export function deleteQuickNote(id, e) {
    if (e) e.stopPropagation();
    import('./ui-dialog.js').then(({ customConfirm }) => {
        customConfirm('Are you sure you want to delete this quick note?').then(confirmed => {
            if (confirmed) {
                import('./state.js').then(({ dashboardData, saveData }) => {
                    const qnCat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
                    if (qnCat) {
                        qnCat.items = qnCat.items.filter(n => n.id !== id);
                        saveData();
                        import('./ui-core.js').then(({ renderAll }) => {
                            renderAll();
                        });
                    }
                });
            }
        });
    });
}

export function copyQuickNote(id, e) {
    if (e) e.stopPropagation();
    import('./state.js').then(({ dashboardData }) => {
        const qnCat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
        if (qnCat) {
            const note = qnCat.items.find(n => n.id === id);
            if (note && note.n) {
                import('./utils.js').then(({ copyToClipboard }) => {
                    copyToClipboard(note.n);
                });
            }
        }
    });
}