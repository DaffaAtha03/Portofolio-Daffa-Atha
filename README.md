# Portofolio Daffa

Situs statis: tidak perlu build, tidak perlu server. Buka `index.html` di browser, atau unggah seluruh isi folder ini ke GitHub Pages / Cloudflare Pages / Netlify (langkah GitHub Pages ada di `PANDUAN.md` bagian 5).

**Ingin mengubah isi portofolio?** Edit satu file saja: `content.js`.
Langkah lengkap (tambah proyek, sertifikat, pengalaman, dll.) ada di **`PANDUAN.md`**.

```
index.html          kerangka halaman
.nojekyll           penanda untuk GitHub Pages (jangan dihapus)
content.js          ISI PORTOFOLIO (Indonesia)  <- file yang kamu edit
content.en.js       terjemahan Inggris (hanya teks yang berubah)
PANDUAN.md          panduan update
cv.pdf              CV untuk tombol "Unduh CV"
cv-en.pdf           CV bahasa Inggris (tombol CV saat situs berbahasa Inggris)
assets/
  app.js            mesin (jangan diubah)
  i18n.js           teks tombol/menu ID & EN
  dokumentasi/      PDF + gambar dokumentasi tiap proyek
  style.css         tampilan
  img/              foto profil, logo sekolah, ikon situs
  sertifikat/       PDF sertifikat
```

Cek kesalahan isi: buka `index.html?cek=1`.
Tampilan ringkas langsung: `index.html?view=ringkas` (cocok untuk dikirim ke HRD).

Bahasa: tombol **ID | EN** ada di bilah atas. Tautan langsung: `index.html?lang=en`.
Dokumentasi proyek: blok `docs` di tiap proyek pada `content.js` (PDF + galeri gambar yang bisa diperbesar).
