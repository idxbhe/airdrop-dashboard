// js/handlers-global.js
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