// js/state.js
import { firebaseConfig } from './config.js';

// Inisialisasi Firebase menggunakan library CDN global yang ada di index.html
firebase.initializeApp(firebaseConfig);
export const db = firebase.database();

export let dashboardData = [];
export let currentCategoryId = null;
export let selectedItemId = null;
export let activeItemId = null;
export let isSyncing = false;
export let isCategoryEditMode = false;

// State markdown diambil dari localStorage agar persistent, default true jika belum ada
export let isMarkdownMode = localStorage.getItem('airdrop_markdown_mode') !== 'false';

export let categorySortable = null;
export let entriesSortable = null;

// Setter functions untuk mengizinkan perubahan state dari modul lain
export function setDashboardData(data) { dashboardData = data; }
export function setCurrentCategoryId(id) { currentCategoryId = id; }
export function setSelectedItemId(id) { selectedItemId = id; }
export function setActiveItemId(id) { activeItemId = id; }
export function setIsCategoryEditMode(status) { isCategoryEditMode = status; }
export function setIsMarkdownMode(status) { 
    isMarkdownMode = status; 
    localStorage.setItem('airdrop_markdown_mode', status); // Simpan state saat diubah
}
export function setCategorySortable(instance) { categorySortable = instance; }
export function setEntriesSortable(instance) { entriesSortable = instance; }

export function repairData() {
    if (!Array.isArray(dashboardData)) dashboardData = [];
    dashboardData.forEach(cat => {
        if (!cat.items || !Array.isArray(cat.items)) cat.items = [];
    });
}

export function saveLocal() {
    localStorage.setItem('airdrop_terminal_data', JSON.stringify(dashboardData));
}

export function saveData() {
    isSyncing = true;
    saveLocal();
    db.ref('dashboard_data').set(dashboardData).then(() => {
        setTimeout(() => { isSyncing = false; }, 500);
    });
}

export function startLoadingProcess(onDataLoadedCallback) {
    const local = localStorage.getItem('airdrop_terminal_data');
    if (local) {
        try {
            dashboardData = JSON.parse(local);
            repairData();
            if (onDataLoadedCallback) onDataLoadedCallback();
        } catch (e) {}
    }

    db.ref('dashboard_data').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            dashboardData = snapshot.val();
            repairData();
            saveLocal();
            if (onDataLoadedCallback) onDataLoadedCallback();
        }

        db.ref('dashboard_data').on('value', (liveSnap) => {
            if (!isSyncing && liveSnap.exists()) {
                const cloudData = liveSnap.val();
                if (JSON.stringify(cloudData) !== JSON.stringify(dashboardData)) {
                    dashboardData = cloudData;
                    repairData();
                    saveLocal();
                    if (onDataLoadedCallback) onDataLoadedCallback();
                }
            }
        });
    });
}