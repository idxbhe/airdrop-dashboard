// js/auth.js
import { auth, currentUser, setCurrentUser, setIsAuthReady, setIsGuestMode, resetState, startLoadingProcess, cleanupDatabaseListeners } from './state.js';
import { renderAll } from './ui-core.js';
import { customAlert, customConfirm } from './ui-dialog.js';

export function initAuth() {
    if (!auth) {
        // Jika auth tidak tersedia (gagal inisialisasi / Guest Mode)
        finishLoadingAndRender();
        return;
    }

    auth.onAuthStateChanged((user) => {
        setIsAuthReady(true);
        if (user) {
            // User Login
            setCurrentUser(user);
            setIsGuestMode(false);
            updateAuthUI(user);
        } else {
            // User Logout / Belum Login
            setCurrentUser(null);
            setIsGuestMode(true);
            updateAuthUI(null);
        }
        
        // Memulai proses load data dan render UI setelah auth diketahui
        finishLoadingAndRender();
    });
}

function finishLoadingAndRender() {
    startLoadingProcess(() => {
        renderAll();
        // Sembunyikan loading screen
        const loadingScreen = document.getElementById('authLoadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    });
}

function updateAuthUI(user) {
    const userProfileArea = document.getElementById('userProfileArea');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (user) {
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/24';
        userName.textContent = user.displayName || user.email || 'User';
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'block';
    } else {
        userAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=random';
        userName.textContent = 'Guest';
        if (btnLogin) btnLogin.style.display = 'block';
        if (btnLogout) btnLogout.style.display = 'none';
    }
}

export function toggleUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Menutup dropdown jika klik di luar
document.addEventListener('click', (e) => {
    const userProfileArea = document.getElementById('userProfileArea');
    const menu = document.getElementById('userDropdownMenu');
    if (userProfileArea && menu && !userProfileArea.contains(e.target)) {
        menu.classList.remove('show');
    }
});

export async function loginWithGoogle() {
    if (!auth) {
        await customAlert("Firebase Auth is not available.");
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(async (error) => {
        console.error("Login failed:", error);
        if (error.code === 'auth/popup-blocked') {
            await customAlert("Pop-up blocked by browser. Allow pop-ups to log in.");
        } else {
            await customAlert(`Login failed: ${error.message}`);
        }
    });
}

export async function logout() {
    if (!auth) return;

    const confirmed = await customConfirm("Are you sure you want to log out?");
    if (!confirmed) return;

    // Matikan pantauan data sebelum sesi berakhir
    cleanupDatabaseListeners();

    auth.signOut().then(() => {
        // Hapus state dan local storage terkait jika ingin clean slate
        resetState();
        
        // Reset UI agar render kosong, state auth observer akan mengambil alih sisanya
        document.getElementById('categoryList').innerHTML = '';
        document.getElementById('entriesList').innerHTML = '';
        document.getElementById('detailContent').innerHTML = `<div class="empty-state">Select an entry to view details</div>`;
        document.getElementById('currentCategoryName').textContent = 'Loading...';

    }).catch(async (error) => {
        console.error("Logout failed:", error);
        await customAlert("Logout failed.");
    });
}
