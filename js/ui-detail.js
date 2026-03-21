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
    else if (itemStatus === 'ABANDONED') statusClass = 'status-abandoned';

    const badgeHtml = `<div class="status-badge ${statusClass}" style="padding: 0;">
        <span class="status-label" style="padding-left: 10px;">Status:</span>
        <select class="status-val status-select-inline ${statusClass}" onchange="handleStatusChange('${item.id}', this.value)" style="border: none; background: transparent; color: inherit; font-family: monospace; font-weight: bold; cursor: pointer; outline: none; margin-left: -5px;">
            <option value="UNKNOWN" ${itemStatus === 'UNKNOWN' ? 'selected' : ''}>UNKNOWN</option>
            <option value="ELIGABLE" ${itemStatus === 'ELIGABLE' ? 'selected' : ''}>ELIGABLE</option>
            <option value="NOT ELIGABLE" ${itemStatus === 'NOT ELIGABLE' ? 'selected' : ''}>NOT ELIGABLE</option>
            <option value="ABANDONED" ${itemStatus === 'ABANDONED' ? 'selected' : ''}>ABANDONED</option>
        </select>
    </div>`;

    let statusHtml = badgeHtml;

    let countdownHtml = '';
    const hasReset = item.r && item.r !== 'checklist' && item.r !== 'none';
    if (hasReset) {
        if (item.c) {
            countdownHtml = `
                <div class="detail-reset-box">
                    <span class="reset-label">RESET IN</span>
                    <span class="countdown-detail" data-id="${item.id}">--:--:--</span>
                </div>
            `;
        } else {
            countdownHtml = `<span class="detail-ready">Ready to complete</span>`;
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
    const rawNote = item.n || '';
    
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
        <div class="detail-header-row" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                ${favicon}
                <h2 class="detail-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">${item.t}</h2>
            </div>
            <div style="flex-shrink: 0;">
                ${countdownHtml}
            </div>
        </div>
        ${addedHtml}
        ${statusHtml}
        ${linkHtml}
        
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
                <button class="icon-btn" id="btnInlineNoteEdit" onclick="toggleInlineNoteEdit()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px;" title="Edit Note">✏️</button>
            </div>
        </div>
        
        <div id="inlineNoteViewArea" class="detail-note ${fontClass}">${noteHtml}</div>
        
        <div id="inlineNoteEditContainer" style="display: none; margin-top: 10px;">
            <textarea id="inlineNoteEditArea" class="note-editor-area mono-font" style="width: 100%; min-height: 200px; max-height: 60vh; padding: 10px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text); resize: vertical;">${rawNote}</textarea>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
                <button class="btn" onclick="toggleInlineNoteEdit()">CANCEL</button>
                <button class="btn btn-accent" onclick="saveInlineNote('${item.id}')">SAVE NOTES</button>
            </div>
        </div>
    `;
}