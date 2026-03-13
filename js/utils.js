import { dashboardData } from './state.js';
import { customAlert } from './ui-dialog.js';

export function getFaviconHtml(u) {
    if (!u) return '';
    try {
        const domain = new URL(u.startsWith('http') ? u : 'https://' + u).hostname;
        return `
            <img src="https://unavatar.io/${domain}?fallback=https://cdn-icons-png.flaticon.com/512/3272/3272605.png"
                 class="entry-icon"
                 alt="icon"
                 onerror="this.style.display='none'">
        `;
    } catch (e) {
        return '';
    }
}
export function findItem(id) {
    for (let cat of dashboardData) {
        const found = cat.items.find(i => i.id === id);
        if (found) return found;
    }
    return null;
}

export function getNextResetTimestamp(item) {
    if (!item || !item.r || item.r === 'checklist' || item.r === 'none') return null;

    const base = item.lc > 0 ? item.lc : Date.now();

    if (item.r === 'daily') return base + 24 * 60 * 60 * 1000;
    if (item.r === 'weekly') return base + 7 * 24 * 60 * 60 * 1000;
    if (item.r === 'monthly') {
        let d = new Date(base);
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    if (item.r.startsWith('clock:')) {
        const [hh, mm] = item.r.slice(6).split(':').map(n => parseInt(n, 10));
        let d = new Date(base);
        d.setHours(hh, mm, 0, 0);
        if (d.getTime() <= base) d.setDate(d.getDate() + 1);
        return d.getTime();
    }
    if (item.r.startsWith('duration:')) {
        const parts = item.r.slice(9).split(':').map(n => parseInt(n) || 0);
        const totalMs = (parts[0] * 3600000) + (parts[1] * 60000) + (parts[2] * 1000);
        return totalMs > 0 ? base + totalMs : null;
    }
    if (item.r.includes(':')) {
        const parts = item.r.split(':');
        if (parts.length >= 3) {
            const day = parts[0].toLowerCase();
            const hh = parseInt(parts[1], 10);
            const mm = parseInt(parts[2], 10);
            
            let d = new Date(base);
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(day);
            
            if (targetDay !== -1) {
                let currentDay = d.getDay();
                let daysToAdd = (targetDay - currentDay + 7) % 7;
                if (daysToAdd === 0) daysToAdd = 7;
                d.setDate(d.getDate() + daysToAdd);
                d.setHours(hh, mm, 0, 0);
                return d.getTime();
            }
        }
    }
    return null;
}

export function getRemainingMs(item) {
    if (!item.r || item.r === 'checklist' || item.r === 'none') {
        return item.c ? Infinity : 0;
    }
    if (!item.c) return 0;
    const target = getNextResetTimestamp(item);
    if (!target) return Infinity;
    const rem = target - Date.now();
    return rem > 0 ? rem : 0;
}

export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        customAlert('✅ Link copied to clipboard!');
    });
}