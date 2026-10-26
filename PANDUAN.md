# Panduan Update Portofolio

Kamu **tidak perlu lagi membaca ribuan baris kode**. Semua isi portofolio (teks, proyek, pengalaman, sertifikat, kontak) ada di **satu file: `content.js`**. Tampilan *Code Editor*, *Tampilan Ringkas*, dan jawaban *Daffa-Agent* otomatis dibuat dari file itu.

## 1. Isi folder

| File / folder | Fungsi | Perlu diedit? |
|---|---|---|
| `content.js` | **Semua isi portofolio** | **Ya, ini satu-satunya** |
| `index.html` | Kerangka halaman | Hampir tidak pernah |
| `assets/app.js` | Mesin yang membangun halaman | Tidak |
| `assets/style.css` | Warna, ukuran, animasi, versi HP | Jarang |
| `assets/img/` | Foto profil, logo sekolah, ikon situs | Saat ganti gambar |
| `assets/sertifikat/` | File PDF sertifikat | Saat tambah sertifikat |
| `cv.pdf` / `cv-en.pdf` | CV Indonesia / Inggris (untuk tombol Unduh) | Saat CV berubah |

## 2. Cara mengedit (3 aturan)

1. Buka `content.js` dengan **VS Code** (disarankan, karena salah ketik langsung bergaris merah) atau Notepad.
2. Ubah teks **di antara tanda kutip** `'...'`. Jangan hapus koma `,` di akhir baris.
3. Simpan, lalu **refresh** `index.html` di browser.

Hal yang sering bikin error:

- **Tanda kutip satu di dalam teks** akan merusak file. Gunakan kutip miring `’` atau tulis `\'`. Contoh: `'Don\'t'`.
- **Angka** (`value`, `decimals`) ditulis **tanpa kutip**: `value: 0.63`, bukan `value: '0.63'`.
- Teks boleh pakai `**tebal**`, `*miring*`, dan `\n` untuk pindah baris.
- Kolom yang dikosongkan `''` otomatis **disembunyikan** (misalnya email yang belum ada).

**Cek kesalahan:** buka `index.html?cek=1`. Kotak di bawah layar akan menyebut bagian mana di `content.js` yang janggal. Jika halaman benar-benar kosong, tekan **F12** lalu buka tab *Console*; baris yang salah akan disebut di sana.

## 3. Resep cepat

### Mengisi kontak, link, foto, CV
Di bagian `contact` isi `email`, `github`, `linkedin`. Biarkan `''` bila belum ada. Ganti `photo` / `cv` bila nama file berbeda. `photoPosition: '50% 22%'` mengatur bagian foto yang tampil (angka kedua: makin besar makin ke bawah).

### Menambah keahlian
Di `skills` → `groups`, tambahkan nama di dalam `items`:
```js
items: ['Python', 'SQL', 'Docker'],
```

### Menambah proyek
Di `projects`, salin satu blok `{ ... },` (contoh siap pakai ada di bagian komentar paling bawah daftar proyek), tempel setelah blok terakhir, lalu ubah isinya. Proyek otomatis muncul di daftar file, tab, Tampilan Ringkas, dan bisa ditanyakan ke agent. Tambahkan `keywords` agar agent mudah menemukannya.

- `file` berakhiran `.py` = gaya Python, selain itu gaya JavaScript.
- `metrics` (angka yang menghitung naik) boleh dihapus bila tidak ada angka.
- Link GitHub/demo yang `''` otomatis tidak ditampilkan.

### Menyembunyikan proyek atau bagian
- Satu proyek: tambah `show: false,` di dalam blok proyeknya.
- Satu bagian: `hide: ['education'],` (pilihan: `about`, `skills`, `ai`, `experience`, `education`, `certificates`).

### Menambah sertifikat
1. Taruh PDF di `assets/sertifikat/`.
2. Di `certificates.groups`, salin satu baris `{ t: ..., f: ... },`:
```js
{ t: 'Nama Sertifikat', en: 'English name (opsional)', d: 'Mar 2026', f: 'nama-file.pdf' },
```
Penerbit otomatis `defaultIssuer`; isi `by: '...'` bila berbeda.

### Menambah pengalaman atau pendidikan
Salin satu blok di `experience.items` / `education.items`. Entri pendidikan yang memiliki `degree` tampil sebagai kartu utama (lengkap IPK dan skripsi); lainnya tampil sebagai kartu sekolah.

### Menambah bagian baru (penghargaan, organisasi, publikasi, dll.)
Di bagian `extra`, hapus tanda komentar pada contoh yang tersedia lalu isi. Bagian baru otomatis punya file di daftar kiri, tab, dan halaman Tampilan Ringkas. `after: 'certificates'` mengatur posisinya.

### Menambah istilah kamus (tooltip)
Di `glossary`, satu baris saja:
```js
'Docker': 'Alat untuk membungkus aplikasi agar mudah dijalankan di mana saja.',
```
Setiap kemunculan pertama istilah itu di sebuah paragraf otomatis diberi garis titik + penjelasan (huruf besar/kecil tidak berpengaruh).

### Mengubah kata yang mengetik sendiri / pesan status bar
`profile.roles` dan `site.statusMessages`.

### Memperbarui CV
Edit file Word CV milik Anda (simpan di komputer, jangan diunggah ke repo publik), **Save as PDF**, beri nama `cv.pdf` (Indonesia) atau `cv-en.pdf` (Inggris), timpa file lama.

## 4. Pratinjau link (WhatsApp / LinkedIn)
Di `<head>` `index.html` ada blok bertanda `PRATINJAU LINK`. Ubah `og:title` dan `og:description` bila nama atau headline berubah.

`og:url` dan `og:image` sudah diisi dengan alamat GitHub Pages `https://daffaatha03.github.io/Portofolio-Daffa-Atha/`. **Jika nama repository kamu berubah dari `Portofolio-Daffa-Atha`** (atau kamu memakai domain sendiri), ganti `Portofolio-Daffa-Atha` di kedua baris itu dengan nama repository yang benar; kalau tidak, gambar pratinjau tidak akan muncul saat link dibagikan.

## 5. Menaruh online

### GitHub Pages (disarankan)
1. Buat repository baru di GitHub, mis. `Portofolio-Daffa-Atha` (Public).
2. Unggah **seluruh isi folder ini** (bukan folder induknya) ke repository: `index.html` harus berada di akar repository. Lewat web: *Add file* → *Upload files*, seret semua file dan folder (termasuk `.nojekyll`), lalu *Commit changes*.
3. Buka *Settings* → *Pages* → *Build and deployment* → Source: **Deploy from a branch** → Branch: `main` / folder `/ (root)` → *Save*.
4. Tunggu 1–2 menit; situs tampil di `https://daffaatha03.github.io/Portofolio-Daffa-Atha/`.
5. Setelah mengedit `content.js`, unggah ulang file yang berubah. Jika perubahan belum terlihat, tekan **Ctrl+F5** (GitHub Pages menyimpan cache beberapa menit).

### Alternatif: Cloudflare Pages / Netlify
*Workers & Pages* → *Create* → *Pages* → *Upload assets*, lalu unggah seluruh isi folder ini.

Halaman memuat Tailwind, font, dan ikon dari internet (CDN), jadi pengunjung perlu koneksi saat pertama membuka.

## 6. Daffa-Agent
Agent membaca isi halaman yang dibangun dari `content.js`, jadi **jawabannya ikut berubah otomatis** saat kamu mengedit. Ia hanya menjawab hal yang tertulis di portofolio. Untuk menyesuaikan sapaan dan contoh pertanyaan, ubah bagian `agent`.

## 7. Jika ada masalah

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Halaman muncul tulisan *content.js tidak terbaca* | Kutip / koma kurang di `content.js`, atau file tidak sefolder dengan `index.html` | Cek di VS Code (garis merah) atau F12 → Console |
| Satu bagian muncul kotak merah ⚠ | Isi bagian itu salah ketik | Perbaiki bagian yang disebut; bagian lain tetap aman |
| Proyek tidak muncul | Ada `show: false`, atau koma antar blok hilang | Periksa blok proyek tadi |
| Foto tidak tampil | Nama file/folder berbeda | Samakan `contact.photo` dengan nama file di `assets/img/` |
| Sertifikat tidak terbuka | Nama PDF tidak sama persis | Samakan nilai `f` dengan nama file |
| Angka tidak menghitung naik | `value` ditulis dengan kutip | Hapus tanda kutipnya |

## 8. Ide pengembangan berikutnya
- **Demo online** untuk CineMatch (Streamlit Community Cloud) lalu isi `links.demo`; recruiter suka yang bisa langsung dicoba.
- **Tulisan / catatan belajar** (misalnya perjalanan membangun PrivateAI) lewat bagian `extra`.
- **Domain sendiri** dan `og:image` agar link terlihat profesional saat dibagikan.
- **CV versi bahasa Inggris** (`cv-en.pdf`) untuk melengkapi tombol EN di situs.
- **Statistik pengunjung** yang ramah privasi (Cloudflare Web Analytics) untuk tahu bagian mana yang dibaca recruiter.

## 9. Bahasa Inggris (tombol ID | EN)
- `content.js` = isi bahasa Indonesia (dasar). `content.en.js` = hanya teks yang berbeda di bahasa Inggris.
- **Penting:** daftar berisi objek (proyek, metrics, items, grup sertifikat, `flow`) digabung **menurut urutan**. Jadi saat menambah proyek/sertifikat di `content.js`, tambahkan juga entri di posisi yang sama pada `content.en.js` (atau `{}` bila tidak ada yang diterjemahkan).
- `glossary` di `content.en.js` menggantikan seluruh kamus Indonesia; kunci istilahnya harus sama persis dengan kata di teks Inggris.
- Teks tombol/menu/tur/agent ada di `assets/i18n.js`.

## 10. Dokumentasi proyek
Tiap proyek punya blok `docs` (ringkasan, fakta, temuan, galeri gambar, batasan). Letakkan PDF dan gambar (.webp/.png) di `assets/dokumentasi/`, lalu isi `pdf` dan `figures[].src`. Tambahkan `fit: 'top'` pada gambar yang sangat tinggi agar thumbnail memotong dari atas. Hapus blok `docs` bila tidak diperlukan.

## 11. CV per bahasa & Catatan belajar
- Tombol CV mengikuti bahasa: `contact.cv` di `content.js` (cv.pdf) dan di `content.en.js` (cv-en.pdf). Ganti file PDF-nya bila CV diperbarui.
- "Catatan belajar" adalah entri `extra` (id `catatan`) di `content.js`, terjemahannya di `extra` pada `content.en.js` (urutan item harus sama). Edit teksnya dengan gaya bahasa Anda sendiri.

## 12. Privasi (repo publik)
Nomor WhatsApp tidak ditampilkan sebagai teks; tombol WhatsApp tetap berfungsi, tetapi nomornya tetap ada di tautan `wa.me` pada kode (tidak bisa disembunyikan sepenuhnya di situs statis). Domisili hanya "Bekasi, Jawa Barat". File Word CV tidak disertakan di repo.
