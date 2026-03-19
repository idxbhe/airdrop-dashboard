// js/handlers-entry.js
import { 
    dashboardData, currentCategoryId, activeItemId, selectedItemId,
    setActiveItemId, setSelectedItemId, saveData 
} from './state.js';
import { findItem } from './utils.js';
import { renderAll } from './ui-core.js';
import { renderEntries } from './ui-entry.js';
import { showDetail } from './ui-detail.js';
import { closeModal } from './handlers-global.js';
import { customAlert, customConfirm } from './ui-dialog.js';

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

    const statusDiv = document.createElement('div');
    statusDiv.innerHTML = `
        <label class="label-tiny">Status</label>
        <select id="inpStatus">
            <option value="UNKNOWN">UNKNOWN</option>
            <option value="ELIGABLE">ELIGABLE</option>
            <option value="NOT ELIGABLE">NOT ELIGABLE</option>
        </select>
    `;
    grid.appendChild(statusDiv);

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
            <option value="daily">Daily (24 Hours)</option>
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
            <input type="number" id="durH" min="0" placeholder="Hours">
            <input type="number" id="durM" min="0" max="59" placeholder="Minutes">
            <input type="number" id="durS" min="0" max="59" placeholder="Seconds">
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
            
            const inpStatus = document.getElementById('inpStatus');
            if (inpStatus) inpStatus.value = item.s || 'UNKNOWN';

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

export async function handleSaveEntry() {
    const title = document.getElementById('inpT').value.trim();
    if (!title) {
        await customAlert("Title required!");
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
    
    const statusVal = document.getElementById('inpStatus') ? document.getElementById('inpStatus').value : 'UNKNOWN';

    if (activeItemId) {
        const item = findItem(activeItemId);
        if (item) {
            item.t = title;
            item.u = url;
            item.n = note;
            item.r = resetType;
            item.s = statusVal;
        }
    } else {
        cat.items.push({
            id: Date.now().toString(36),
            t: title,
            u: url,
            n: note,
            r: resetType,
            s: statusVal,
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

export async function editCurrentItem() {
    if (!selectedItemId) {
        await customAlert('Please select an entry first!');
        return;
    }
    openEntryModal(selectedItemId);
}

export async function deleteCurrentItem() {
    if (!selectedItemId) return;
    const confirmed = await customConfirm('Delete this entry?', 'Confirmation', true);
    if (!confirmed) return;

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
    document.getElementById('detailContent').innerHTML = `<div class="empty-state">Select an entry to view details</div>`;
}

export async function removeDuplicates() {
    if (!currentCategoryId) return;
    
    const cat = dashboardData.find(c => c.id === currentCategoryId);
    if (!cat || !cat.items || cat.items.length === 0) return;

    const seen = new Set();
    const uniqueItems = [];
    let duplicateCount = 0;

    for (const item of cat.items) {
        // Gabungkan judul dan URL untuk mengecek keunikan (case-insensitive)
        const key = `${(item.t || '').trim().toLowerCase()}|${(item.u || '').trim().toLowerCase()}`;
        if (seen.has(key)) {
            duplicateCount++;
        } else {
            seen.add(key);
            uniqueItems.push(item);
        }
    }

    if (duplicateCount > 0) {
        const confirmed = await customConfirm(`Found ${duplicateCount} duplicates in this category. Remove duplicates?`, 'Confirmation', true);
        if (confirmed) {
            cat.items = uniqueItems;
            
            // Jika selectedItem yang sedang aktif ternyata ikut terhapus karena duplikat
            const isSelectedStillExists = cat.items.some(i => i.id === selectedItemId);
            if (selectedItemId && !isSelectedStillExists) {
                setSelectedItemId(null);
                document.getElementById('detailContent').innerHTML = `<div class="empty-state">Select an entry to view details</div>`;
            }

            saveData();
            renderEntries(currentCategoryId);
        }
    } else {
        await customAlert('No duplicates found in this category.');
    }
}