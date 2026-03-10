// js/handlers.js
import { 
    dashboardData, currentCategoryId, selectedItemId, activeItemId, isCategoryEditMode, isMarkdownMode,
    setCurrentCategoryId, setSelectedItemId, setActiveItemId, setIsCategoryEditMode, setIsMarkdownMode, saveData 
} from './state.js';
import { findItem } from './utils.js';
import { renderAll, renderCategories, renderEntries, showDetail } from './ui.js';

export function switchCategory(id) {
    setCurrentCategoryId(id);
    setSelectedItemId(null);
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Klik salah satu entry di tengah</div>`;
    renderAll();
}

export function toggleCheck(itemId, e) {
    e.stopPropagation();
    const item = findItem(itemId);
    if (!item || item.r === 'none') return;

    item.c = !item.c;
    item.lc = item.c ? Date.now() : 0;

    saveData();
    renderEntries(currentCategoryId);

    if (selectedItemId === itemId) {
        showDetail(itemId);
    }
}

export function toggleCategoryEditMode() {
    setIsCategoryEditMode(!isCategoryEditMode);
    renderCategories();
}

export function editCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    const cat = dashboardData.find(c => c.id === id);
    if (!cat) return;
    const newTitle = prompt('Rename kategori:', cat.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        cat.title = newTitle.trim();
        saveData();
        renderAll();
    }
}

export function deleteCategory(id, e) {
    if (e) e.stopImmediatePropagation();
    const isLast = dashboardData.length === 1;
    if (!confirm(isLast ? 'Ini kategori terakhir. Hapus dan buat "General" baru?' : 'Hapus kategori ini beserta semua entry-nya?')) return;

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
        document.getElementById('detailContent').innerHTML = `<div class="empty-state">Pilih entri untuk melihat detail</div>`;
    }

    saveData();
    renderAll();
}

export function openEntryModal(itemId = null) {
    setActiveItemId(itemId);
    const modal = document.getElementById('entryModal');

    document.getElementById('inpT').value = '';
    document.getElementById('inpU').value = '';
    document.getElementById('inpN').value = '';

    const grid = document.querySelector('.settings-grid');
    grid.innerHTML = ''; 

    const chkChecklistDiv = document.createElement('div');
    chkChecklistDiv.innerHTML = `
        <label class="label-tiny">Enable Checklist</label>
        <input type="checkbox" id="enableChecklist" checked>
    `;
    grid.appendChild(chkChecklistDiv);

    const chkResetDiv = document.createElement('div');
    chkResetDiv.innerHTML = `
        <label class="label-tiny">Enable Reset</label>
        <input type="checkbox" id="enableReset">
    `;
    grid.appendChild(chkResetDiv);

    const resetTypeDiv = document.createElement('div');
    resetTypeDiv.id = 'resetTypeWrapper';
    resetTypeDiv.style.display = 'none';
    resetTypeDiv.innerHTML = `
        <label class="label-tiny">Reset Type</label>
        <select id="inpResetType" onchange="handleResetTypeChange()">
            <option value="daily">Daily (24 Jam)</option>
            <option value="weekly">Weekly (7 Days)</option>
            <option value="clock:07:00">Every 07.00 AM</option>
            <option value="monday:07:00">Every Monday (at 07.00 AM)</option>
            <option value="duration">Custom by Time</option>
            <option value="clock">Custom by Clock</option>
            <option value="day">Custom by Day</option>
        </select>
    `;
    grid.appendChild(resetTypeDiv);

    const durWrapper = document.createElement('div');
    durWrapper.id = 'durationWrapper';
    durWrapper.style.display = 'none';
    durWrapper.innerHTML = `
        <label class="label-tiny">Custom Duration</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
            <input type="number" id="durH" min="0" placeholder="Jam">
            <input type="number" id="durM" min="0" max="59" placeholder="Menit">
            <input type="number" id="durS" min="0" max="59" placeholder="Detik">
        </div>
    `;
    grid.appendChild(durWrapper);

    const clockWrapper = document.createElement('div');
    clockWrapper.id = 'clockWrapper';
    clockWrapper.style.display = 'none';
    clockWrapper.innerHTML = `
        <label class="label-tiny">Custom Clock</label>
        <input type="time" id="inpCustomClock">
    `;
    grid.appendChild(clockWrapper);

    const dayWrapper = document.createElement('div');
    dayWrapper.id = 'dayWrapper';
    dayWrapper.style.display = 'none';
    dayWrapper.innerHTML = `
        <label class="label-tiny">Custom Day & Time</label>
        <select id="inpCustomDay">
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
        </select>
        <input type="time" id="inpCustomDayTime">
    `;
    grid.appendChild(dayWrapper);

    const chkReset = document.getElementById('enableReset');
    const chkChecklist = document.getElementById('enableChecklist');
    const resetWrapper = document.getElementById('resetTypeWrapper');

    chkReset.addEventListener('change', () => {
        if (chkReset.checked) {
            chkChecklist.checked = true;
            chkChecklist.disabled = true;
        } else {
            chkChecklist.disabled = false;
        }
        resetWrapper.style.display = chkReset.checked ? 'block' : 'none';
        handleResetTypeChange();
    });

    if (itemId) {
        const item = findItem(itemId);
        if (item) {
            document.getElementById('inpT').value = item.t || '';
            document.getElementById('inpU').value = item.u || '';
            document.getElementById('inpN').value = item.n || '';

            const r = item.r || 'checklist';
            chkChecklist.checked = r !== 'none';
            chkReset.checked = r !== 'checklist' && r !== 'none';

            if (chkReset.checked) {
                chkChecklist.disabled = true;
            }

            const selectType = document.getElementById('inpResetType');
            if (r === 'daily') selectType.value = 'daily';
            else if (r === 'weekly') selectType.value = 'weekly';
            else if (r === 'clock:07:00') selectType.value = 'clock:07:00';
            else if (r.startsWith('monday:')) selectType.value = 'monday:07:00';
            else if (r.startsWith('duration:')) {
                selectType.value = 'duration';
                const parts = r.slice(9).split(':').map(n => parseInt(n) || 0);
                document.getElementById('durH').value = parts[0];
                document.getElementById('durM').value = parts[1];
                document.getElementById('durS').value = parts[2];
            } else if (r.startsWith('clock:')) {
                selectType.value = 'clock';
                document.getElementById('inpCustomClock').value = r.substring(6);
            } else if (r.includes(':')) {
                selectType.value = 'day';
                const [day, time] = r.split(':');
                document.getElementById('inpCustomDay').value = day.toLowerCase();
                document.getElementById('inpCustomDayTime').value = time;
            }
        }
    }

    handleResetTypeChange();
    modal.style.display = 'flex';
}

export function handleSaveEntry() {
    const title = document.getElementById('inpT').value.trim();
    if (!title) {
        alert("Title required!");
        return;
    }

    const url = document.getElementById('inpU').value.trim();
    const note = document.getElementById('inpN').value.trim();

    const enableChecklist = document.getElementById('enableChecklist').checked;
    const enableReset = document.getElementById('enableReset').checked;

    let resetType = 'none';
    if (enableChecklist) {
        resetType = 'checklist';
        if (enableReset) {
            const selType = document.getElementById('inpResetType').value;
            if (selType === 'daily') resetType = 'daily';
            else if (selType === 'weekly') resetType = 'weekly';
            else if (selType === 'clock:07:00') resetType = 'clock:07:00';
            else if (selType === 'monday:07:00') resetType = 'monday:07:00';
            else if (selType === 'duration') {
                const h = parseInt(document.getElementById('durH').value) || 0;
                const m = parseInt(document.getElementById('durM').value) || 0;
                const s = parseInt(document.getElementById('durS').value) || 0;
                resetType = (h || m || s) ? `duration:${h}:${m}:${s}` : 'daily';
            } else if (selType === 'clock') {
                const time = document.getElementById('inpCustomClock').value;
                resetType = time ? `clock:${time}` : 'daily';
            } else if (selType === 'day') {
                const day = document.getElementById('inpCustomDay').value;
                const time = document.getElementById('inpCustomDayTime').value;
                resetType = time ? `${day}:${time}` : 'daily';
            }
        }
    }

    const cat = dashboardData.find(c => c.id === currentCategoryId);
    if (!cat) return;

    if (activeItemId) {
        const item = findItem(activeItemId);
        if (item) {
            item.t = title;
            item.u = url;
            item.n = note;
            item.r = resetType;
        }
    } else {
        cat.items.push({
            id: Date.now().toString(36),
            t: title,
            u: url,
            n: note,
            r: resetType,
            lc: 0,
            c: false,
            createdAt: Date.now()
        });
    }

    saveData();
    closeModal('entryModal');
    renderEntries(currentCategoryId);
    if (activeItemId) showDetail(activeItemId);
    setActiveItemId(null);
}

export function handleResetTypeChange() {
    const enableReset = document.getElementById('enableReset')?.checked;
    const selType = document.getElementById('inpResetType')?.value;

    const durWrapper = document.getElementById('durationWrapper');
    const clockWrapper = document.getElementById('clockWrapper');
    const dayWrapper = document.getElementById('dayWrapper');
    const resetWrapper = document.getElementById('resetTypeWrapper');

    if (resetWrapper) resetWrapper.style.display = enableReset ? 'block' : 'none';
    if (durWrapper) durWrapper.style.display = (enableReset && selType === 'duration') ? 'block' : 'none';
    if (clockWrapper) clockWrapper.style.display = (enableReset && selType === 'clock') ? 'block' : 'none';
    if (dayWrapper) dayWrapper.style.display = (enableReset && selType === 'day') ? 'block' : 'none';
}

export function editCurrentItem() {
    if (!selectedItemId) {
        alert('Pilih entry terlebih dahulu!');
        return;
    }
    openEntryModal(selectedItemId);
}

export function deleteCurrentItem() {
    if (!selectedItemId) return;
    if (!confirm('Hapus entry ini?')) return;

    for (let cat of dashboardData) {
        const idx = cat.items.findIndex(i => i.id === selectedItemId);
        if (idx !== -1) {
            cat.items.splice(idx, 1);
            break;
        }
    }
    setSelectedItemId(null);
    saveData();
    renderAll();
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Pilih entri untuk melihat detail</div>`;
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

export function handleSearch(e) {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.entry-item').forEach(el => {
        const title = el.querySelector('.item-title').innerText.toLowerCase();
        el.style.display = title.includes(q) ? 'flex' : 'none';
    });
}

export function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// === HANDLERS BARU UNTUK FITUR CATATAN ===

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

    // Update title dengan nama tugas
    if (titleEl) {
        titleEl.textContent = `CATATAN [${item.t}]`;
    }

    editArea.value = item.n || '';

    // Terapkan class font sesuai mode ke area view modal
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
        viewArea.innerHTML = '<div class="empty-state">Tidak ada catatan.</div>';
    }

    viewArea.style.display = 'block';
    editArea.style.display = 'none';
    controls.style.display = 'none';
    toggleBtn.style.display = 'inline-block';
    toggleBtn.textContent = '✏️ Mode Edit';

    modal.style.display = 'flex';
}

export function toggleNoteEdit() {
    const viewArea = document.getElementById('noteViewArea');
    const editArea = document.getElementById('noteEditArea');
    const controls = document.getElementById('noteEditControls');
    const toggleBtn = document.getElementById('btnToggleNoteEdit');

    const isEditing = editArea.style.display === 'block';

    if (isEditing) {
        // Cancel / Kembali ke mode view
        viewArea.style.display = 'block';
        editArea.style.display = 'none';
        controls.style.display = 'none';
        toggleBtn.style.display = 'inline-block';
    } else {
        // Masuk mode edit
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
    showDetail(selectedItemId); // Update panel detail belakang layar
    openNoteModal(); // Render ulang modal dan kembali ke mode view
}