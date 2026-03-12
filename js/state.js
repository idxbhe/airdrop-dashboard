// js/state.js
import { firebaseConfig } from './config.js';

export let dashboardData = [];
export let currentCategoryId = null;
export let selectedItemId = null;
export let activeItemId = null;
export let isSyncing = false;
export let isCategoryEditMode = false;
export let isGuestMode = false;
export let db = null;
export let userPath = 'dashboard_data'; // Struktur awal untuk global, siap diubah ke users/${uid}

// State markdown diambil dari localStorage agar persistent, default true jika belum ada
export let isMarkdownMode = localStorage.getItem('airdrop_markdown_mode') !== 'false';

export let categorySortable = null;
export let entriesSortable = null;

// Inisialisasi Firebase dengan try-catch untuk Auto-Guest Mode
try {
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
        throw new Error("Config Firebase kosong");
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (error) {
    console.warn("⚠️ Firebase gagal diinisialisasi atau config tidak ditemukan. Berjalan di Mode Guest (Offline/Lokal).", error);
    isGuestMode = true;
}

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

let syncTimeout = null;
export function saveData() {
    saveLocal();
    
    // Jika guest mode, tidak perlu melakukan sync ke Firebase
    if (isGuestMode || !db) return;

    isSyncing = true;
    
    // Debouncing API Firebase Writes
    if (syncTimeout) clearTimeout(syncTimeout);
    
    syncTimeout = setTimeout(() => {
        db.ref(userPath).set(dashboardData).then(() => {
            setTimeout(() => { isSyncing = false; }, 500);
        }).catch((err) => {
            console.error("Gagal menyimpan ke Firebase:", err);
            isSyncing = false;
        });
    }, 1500); // Tunda 1.5 detik sebelum benar-benar mengirim (hemat write API)
}

export function startLoadingProcess(onDataLoadedCallback) {
    const local = localStorage.getItem('airdrop_terminal_data');
    if (local) {
        try {
            dashboardData = JSON.parse(local);
            repairData();
            if (onDataLoadedCallback) onDataLoadedCallback();
        } catch (e) {
            console.error("Gagal mem-parsing data lokal", e);
        }
    }

    if (isGuestMode || !db) {
        // Jika guest mode, berhenti di sini karena data lokal sudah dimuat
        return;
    }

    db.ref(userPath).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            dashboardData = snapshot.val();
            repairData();
            saveLocal();
            if (onDataLoadedCallback) onDataLoadedCallback();
        }

        db.ref(userPath).on('value', (liveSnap) => {
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
    }).catch(err => {
        console.error("Gagal membaca dari Firebase:", err);
        // Fallback otomatis ke Guest Mode jika terputus/gagal read
        isGuestMode = true; 
    });
}
