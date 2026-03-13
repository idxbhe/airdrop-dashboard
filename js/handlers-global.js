// js/handlers-global.js
import { dashboardData, setDashboardData, saveData, repairData } from './state.js';
import { renderAll } from './ui-core.js';

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

export function exportData() {
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `airdrop_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
}

export function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) throw new Error('Invalid format');
            
            if (confirm('Importing data will overwrite current data. Continue?')) {
                setDashboardData(importedData);
                repairData();
                saveData();
                renderAll();
                alert('✅ Data imported successfully!');
            }
        } catch (e) {
            alert('❌ Failed to import data: Invalid JSON format.');
        }
        event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
}