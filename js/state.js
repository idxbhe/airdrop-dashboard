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
export let auth = null; // Tambahan auth

// State Auth Baru
export let currentUser = null;
export let isAuthReady = false;
export let serverTimeOffset = 0;

// Path & Keys
export let userPath = 'dashboard_data'; 
const BASE_LOCAL_KEY = 'airdrop_terminal_data';

// Helper function untuk LocalStorage Key yang dinamis
export function getLocalKey() {
    return currentUser ? `${BASE_LOCAL_KEY}_${currentUser.uid}` : BASE_LOCAL_KEY;
}

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
    auth = firebase.auth(); // Inisialisasi Auth
} catch (error) {
    console.warn("⚠️ Firebase failed to initialize or config not found. Running in Guest Mode (Offline/Local).", error);
    isGuestMode = true;
    isAuthReady = true; // Guest mode langsung siap
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
export function setCurrentUser(user) { currentUser = user; }
export function setIsAuthReady(status) { isAuthReady = status; }
export function setIsGuestMode(status) { isGuestMode = status; }

export function resetState() {
    dashboardData = [];
    currentCategoryId = null;
    selectedItemId = null;
    activeItemId = null;
    isSyncing = false;
    isCategoryEditMode = false;
}

export function repairData() {
    if (!Array.isArray(dashboardData)) {
        if (dashboardData && typeof dashboardData === 'object') {
            dashboardData = Object.values(dashboardData);
        } else {
            dashboardData = [];
        }
    }

    // Ensure Quick Notes category exists
    let qnCat = dashboardData.find(c => c.id === 'CAT_QUICK_NOTES');
    if (!qnCat) {
        dashboardData.push({
            id: 'CAT_QUICK_NOTES',
            title: 'QUICK NOTES',
            items: []
        });
    }

    // Remove legacy default categories if they exist (they are now virtual filters)
    const defaultCats = ["NOT ELIGABLE", "ABANDONED", "ELIGABLE"];
    dashboardData = dashboardData.filter(cat => !defaultCats.includes(cat.title) || cat.id === 'CAT_QUICK_NOTES');

    dashboardData.forEach(cat => {
        if (!cat.title) cat.title = "General";
        if (!cat.items || !Array.isArray(cat.items)) {
            if (cat.items && typeof cat.items === 'object') {
                cat.items = Object.values(cat.items);
            } else {
                cat.items = [];
            }
        }
    });
}

export function getUserPath() {
    return currentUser ? `users/${currentUser.uid}/dashboard_data` : 'dashboard_data';
}

export function saveLocal() {
    localStorage.setItem(getLocalKey(), JSON.stringify(dashboardData));
}

export function cleanupDatabaseListeners() {
    if (db && currentUser) {
        db.ref(getUserPath()).off();
    }
}

export function mergeGuestData() {
    const guestDataStr = localStorage.getItem(BASE_LOCAL_KEY);
    if (!guestDataStr) return false;

    let guestData = null;
    try {
        guestData = JSON.parse(guestDataStr);
    } catch (e) {
        localStorage.removeItem(BASE_LOCAL_KEY);
        return false;
    }

    if (!Array.isArray(guestData) || guestData.length === 0) {
        localStorage.removeItem(BASE_LOCAL_KEY);
        return false;
    }

    let isMerged = false;

    guestData.forEach(gCat => {
        if (!gCat.items || gCat.items.length === 0) return;

        let targetCat = dashboardData.find(c => c.title && c.title.toLowerCase() === gCat.title.toLowerCase());
        
        if (!targetCat) {
            targetCat = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                title: gCat.title,
                items: []
            };
            dashboardData.push(targetCat);
        }

        gCat.items.forEach(gItem => {
            // Cek agar tidak duplikasi jika Judul dan URL sudah ada di kategori ini
            const isDuplicate = targetCat.items.some(existing => existing.t === gItem.t && existing.u === gItem.u);
            if (!isDuplicate) {
                const newItem = { ...gItem, id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5) };
                targetCat.items.push(newItem);
                isMerged = true;
            }
        });
    });

    localStorage.removeItem(BASE_LOCAL_KEY);
    
    if (isMerged) {
        saveData(); 
        return true;
    }
    return false;
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
        db.ref(getUserPath()).set(dashboardData).then(() => {
            setTimeout(() => { isSyncing = false; }, 500);
        }).catch((err) => {
            console.error("Gagal menyimpan ke Firebase:", err);
            isSyncing = false;
        });
    }, 1500); // Tunda 1.5 detik sebelum benar-benar mengirim (hemat write API)
}

export function startLoadingProcess(onDataLoadedCallback) {
    // Matikan listener lama sebelum membuat yang baru agar tidak duplikat listener
    if (db && !isGuestMode) {
        db.ref(getUserPath()).off();
    }

    const local = localStorage.getItem(getLocalKey());
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
        // Jika guest mode, pastikan data minimal array kosong dan hilangkan loading
        repairData();
        if (onDataLoadedCallback) onDataLoadedCallback();
        return;
    }

    db.ref('.info/serverTimeOffset').on('value', (snapshot) => {
        serverTimeOffset = snapshot.val() || 0;
    });

    const path = getUserPath();

    db.ref(path).once('value').then((snapshot) => {
        try {
            if (snapshot.exists()) {
                dashboardData = snapshot.val();
            } else if (!local) {
                dashboardData = []; // Reset jika cloud kosong & tidak ada local
            }

            repairData(); // Perbaiki data dulu SEBELUM merge

            // Jalankan logika Merge Data Guest jika ada
            if (!isGuestMode) {
                mergeGuestData();
            }

            saveLocal();
        } catch (err) {
            console.error("Error processing cloud data:", err);
        } finally {
            if (onDataLoadedCallback) onDataLoadedCallback();
        }

        db.ref(path).on('value', (liveSnap) => {
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
        repairData();
        if (onDataLoadedCallback) onDataLoadedCallback();
    });
}