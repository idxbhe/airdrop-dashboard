// js/ui-detail.js
import { isMarkdownMode, setSelectedItemId } from './state.js';
import { getFaviconHtml, findItem } from './utils.js';

// Konfigurasi Marked.js untuk menangani bug newline dengan breaks: true
marked.setOptions({
    breaks: true,
    gfm: true
});

export function showDetail(id) {
    setSelectedItemId(id);
    const item = findItem(id);
    if (!item) return;

    document.querySelectorAll('.entry-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));

    const favicon = getFaviconHtml(item.u);
    const fullUrl = item.u ? (item.u.startsWith('http') ? item.u : 'https://' + item.u) : '';

    const itemStatus = item.s || 'UNKNOWN';
    let statusClass = 'status-unknown';
    if (itemStatus === 'ELIGABLE') statusClass = 'status-eligable';
    else if (itemStatus === 'NOT ELIGABLE') statusClass = 'status-not-eligable';
    
    const badgeHtml = `<div class="status-badge ${statusClass}">
        <span class="status-label">Status:</span>
        <span class="status-val">${itemStatus}</span>
    </div>`;

    let countdownHtml = badgeHtml;
    const hasReset = item.r && item.r !== 'checklist' && item.r !== 'none';
    if (hasReset) {
        if (item.c) {
            countdownHtml += `
                <div class="detail-reset-box">
                    <span class="reset-label">RESET IN</span>
                    <span class="countdown-detail" data-id="${item.id}">--:--:--</span>
                </div>
            `;
        } else {
            countdownHtml += `<span class="detail-ready">READY TO COMPLETE</span>`;
        }
    }

    let linkHtml = '';
    if (fullUrl) {
        const truncatedUrl = fullUrl.length > 50 ? fullUrl.substring(0, 40) + '...' + fullUrl.substring(fullUrl.length - 10) : fullUrl;
        linkHtml = `
            <div class="detail-link-box">
                <code class="mono-url">${truncatedUrl}</code>
                <button onclick="copyToClipboard('${fullUrl}')" class="copy-btn">📋</button>
                <a href="${fullUrl}" target="_blank" class="btn-open-link detail-open-btn">Open ↗</a>
            </div>
        `;
    }

    let addedHtml = '';
    const createdAt = item.createdAt || parseInt(item.id, 36);
    if (createdAt) {
        const diffMs = Date.now() - createdAt;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const dayText = days === 0 ? 'Today' : `${days} days ago`;
        addedHtml = `<div class="detail-meta" style="margin-top: 4px; font-style: italic; opacity: 0.7;">Added: ${dayText}</div>`;
    }

    // Mengambil catatan dan memprosesnya sesuai state isMarkdownMode
    let noteHtml = '';
    let fontClass = 'mono-font'; // Default font untuk view
    
    if (item.n) {
        if (isMarkdownMode) {
            noteHtml = marked.parse(item.n);
            fontClass = 'md-font'; // Gunakan font yang lebih baik jika markdown aktif
        } else {
            // Jika markdown mati, render sebagai teks mentah (pre-wrap) dengan font mono
            const safeText = item.n.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            noteHtml = `<div style="white-space: pre-wrap; font-family: inherit;">${safeText}</div>`;
        }
    }

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-header-row">
            ${favicon}
            <h2 class="detail-title">${item.t}</h2>
        </div>
        ${addedHtml}
        ${linkHtml}
        ${countdownHtml}
        
        <div class="note-header-controls">
            <span>NOTES</span>
            <div class="note-buttons">
                <label class="switch-wrapper">
                    <span class="switch-label">MARKDOWN</span>
                    <div class="switch">
                        <input type="checkbox" ${isMarkdownMode ? 'checked' : ''} onchange="toggleMarkdownMode()">
                        <span class="slider"></span>
                    </div>
                </label>
                <button class="btn btn-small btn-accent" onclick="openNoteModal()">OPEN NOTE ⧉</button>
            </div>
        </div>
        
        <div class="detail-note ${fontClass}">${noteHtml}</div>
    `;
}