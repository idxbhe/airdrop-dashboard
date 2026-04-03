# 🚀 Deployment Guide - Netlify

## Quick Deploy

### Option 1: Drag & Drop (Paling Mudah)
1. Buka [Netlify Drop](https://app.netlify.com/drop)
2. Drag seluruh folder proyek ke area upload
3. Tunggu deployment selesai
4. Website langsung live!

### Option 2: Connect Git Repository (Recommended)
1. Push code ke GitHub/GitLab/Bitbucket
2. Login ke [Netlify](https://app.netlify.com)
3. Click "Add new site" > "Import an existing project"
4. Pilih Git provider dan repository
5. Build settings:
   - **Build command:** `echo 'No build needed'` (atau kosongkan)
   - **Publish directory:** `.` (root directory)
6. Click "Deploy site"

### Option 3: Netlify CLI
```bash
# Install Netlify CLI (jika belum)
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## Configuration Files

### netlify.toml
File konfigurasi utama untuk:
- Build settings
- Headers (security, caching)
- Redirects untuk SPA routing

### _redirects
Backup redirect rules jika netlify.toml tidak terbaca

## Pre-Deployment Checklist ✅

- [x] `netlify.toml` sudah dibuat
- [x] `_redirects` sudah dibuat
- [x] `.gitignore` sudah diupdate
- [x] Firebase config sudah ada di `js/config.js`
- [x] Semua CSS files ada di folder `css/`
- [x] Semua JS files ada di folder `js/`
- [x] `index.html` ada di root

## Important Notes

1. **Firebase Config:** File `js/config.js` berisi Firebase API keys yang safe untuk public (client-side keys)
2. **Environment Variables:** File `.env` dan `deepseek-api.txt` tidak akan ter-deploy (sudah di `.gitignore`)
3. **Static Site:** Ini adalah static website, tidak perlu build process
4. **SPA Routing:** Semua routes akan redirect ke `index.html`

## Post-Deployment

1. Test semua fitur:
   - Login with Google
   - CRUD operations
   - Category management
   - Data import/export

2. Custom domain (optional):
   - Netlify dashboard > Domain settings
   - Add custom domain
   - Update DNS records

## Troubleshooting

### "Page not found" saat refresh
✅ Sudah fixed dengan `_redirects` dan `netlify.toml`

### Firebase tidak connect
- Cek console browser untuk errors
- Pastikan Firebase domain sudah authorized di Firebase Console
- Tambahkan domain Netlify ke Firebase Authentication > Authorized domains

### CSS/JS tidak load
- Cek path relatif di `index.html`
- Pastikan semua file ada di repository
- Cek Network tab di browser DevTools

## Support

Jika ada masalah, cek:
- [Netlify Docs](https://docs.netlify.com/)
- [Firebase Docs](https://firebase.google.com/docs)
