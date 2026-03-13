// js/ui-dialog.js

export function customAlert(message, title = 'Notice') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customDialogModal');
        const titleEl = document.getElementById('customDialogTitle');
        const msgEl = document.getElementById('customDialogMessage');
        const btnCancel = document.getElementById('customDialogBtnCancel');
        const btnOk = document.getElementById('customDialogBtnOk');

        titleEl.textContent = title;
        msgEl.textContent = message;
        
        btnCancel.style.display = 'none';
        btnOk.textContent = 'OK';
        
        modal.style.display = 'flex';

        // Hanya binding satu kali
        btnOk.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
    });
}

export function customConfirm(message, title = 'Confirmation', isDestructive = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customDialogModal');
        const titleEl = document.getElementById('customDialogTitle');
        const msgEl = document.getElementById('customDialogMessage');
        const btnCancel = document.getElementById('customDialogBtnCancel');
        const btnOk = document.getElementById('customDialogBtnOk');

        titleEl.textContent = title;
        msgEl.textContent = message;
        
        btnCancel.style.display = 'inline-block';
        btnCancel.textContent = 'CANCEL';
        btnOk.textContent = 'CONFIRM';
        
        // Atur warna tombol konfirmasi
        if (isDestructive) {
            btnOk.className = 'btn btn-danger';
        } else {
            btnOk.className = 'btn btn-accent';
        }
        
        modal.style.display = 'flex';

        btnOk.onclick = () => {
            modal.style.display = 'none';
            btnOk.className = 'btn btn-accent'; // Reset to default
            resolve(true);
        };

        btnCancel.onclick = () => {
            modal.style.display = 'none';
            btnOk.className = 'btn btn-accent'; // Reset to default
            resolve(false);
        };
    });
}

export function customPrompt(message, defaultValue = '', title = 'Input') {
    // Untuk prompt sederhana, kita bisa menggunakan bawaan browser atau membuat modal khusus
    // Sementara, untuk keamanan transisi yang cepat, kita gunakan prompt bawaan karena ini sinkron,
    // tapi kita bungkus di Promise agar sejalan.
    return new Promise((resolve) => {
        const res = prompt(message, defaultValue);
        resolve(res);
    });
}
