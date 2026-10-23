# Proje Veri Yönetimi — Kurumsal Kadastro Veri Yönetim Sistemi

Müşteriden alınan dört grup kadastro sayısallaştırma ve iyileştirme Excel dosyasındaki verileri web ortamında görüntülemek, kurum/rol yetkilerine göre düzenlemek, işlem geçmişini (audit log) takip etmek ve veritabanındaki güncel verileri tekrar `.xlsx` formatında dışa aktarmak için geliştirilmiş tam kapsamlı kurumsal web uygulaması.

---

## 1. İncelenen Dört Excel Dosyası ve Grup Eşleşmeleri

Projeye eklenen dört Excel dosyası XML ve hücre düzeyinde incelenmiş ve aşağıdaki grup eşleşmeleri doğrulanmıştır:

| Grup Kodu | Kaynak Dosya (`data/seed-excels/`) | Kaynak Sayfa | Mahalle/Birim Kayıt Sayısı | Toplam Parsel | İyileştirme Yapılacak | Sayısallaştırma Yapılacak | Kapsanan İlçeler |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **GRUP-1** | `GRUP-1.xlsx` | 1. Sayfa *(İST. 1. GRUP - 67.376 Parsel)* | **79** | 271.333 | 37.700 | 29.676 | Arnavutköy, Bağcılar, Bahçelievler, Bakırköy, Beylikdüzü, Büyükçekmece, Esenler, Esenyurt, Güngören, Sarıyer |
| **GRUP-2** | `GRUP-2.xlsx` | `GRUP-2` *(Anadolu Yakası)* | **127** | 253.253 | 56.550 | 34.283 | Ataşehir, Beykoz, Çekmeköy, Kadıköy, Kartal, Maltepe, Pendik, Sancaktepe, Şile, Tuzla, Ümraniye, Üsküdar |
| **GRUP-3** | `GRUP-3.xlsx` | 1. Sayfa *(İST. 3. GRUP - 73.813 Parsel)* | **67** | 168.344 | 35.253 | 38.560 | Avcılar, Başakşehir, Bayrampaşa, Eyüpsultan, Gaziosmanpaşa, Küçükçekmece, Sultangazi |
| **GRUP-4** | `GRUP-4.xlsx` | `GRUP-4` *(İST. 4. GRUP - 96.398 Parsel)* | **195** | 133.599 | 53.564 | 42.834 | Beşiktaş, Beyoğlu, Fatih, Kağıthane, Şişli |

### Excel Yapısal Bulguları ve İşlenme Kuralları
- **Sütun Yapısı (`A` - `AQ`, 43 Sütun):** Her dört dosyanın ana çalışma sayfası birebir aynı 43 sütunlu kadastro takip şemasına sahiptir (`HİZMET BİRİMİ`, `İLÇESİ`, `MAHALLE/KÖY` ile başlayıp `AÇIKLAMA` ile biten 43 sütun).
- **Birleştirilmiş Başlıklar:** `B2:AQ2` proje üst başlığıdır. 3. ve 4. satırlar tablo başlıklarıdır; `N3:P3` yatayda `PAFTA` olarak birleştirilmiş, altında `N4=1000`, `O4=2000`, `P4=5000` ölçek sütunları yer almaktadır.
- **Dip Toplam ve Formüller:** Veri satırlarında formül bulunmamakta, yalnızca en alt satırda `SUM(D5:D...)` ve `V-U-T` dip toplam formülleri yer almaktadır. İçe aktarma sırasında dip toplam satırları ve boş satırlar normal kayıt olarak **aktarılmaz**; hem web tablosunda hem de Excel dışa aktarmada güncel veritabanı kayıtları üzerinden dinamik olarak hesaplanır.
- **İkincil Şablon Sayfaları:** `GRUP-1` ve `GRUP-3` dosyalarında şablondan kalma 2. çalışma sayfası (`GRUP-9` Kütahya Kadastro Müdürlüğü) tespit edilmiş olup içe aktarımda otomatik olarak yok sayılmaktadır.

---

## 2. Kullanıcı Rolleri ve Yetki Matrisi

Kullanıcı hesapları (`User`) ve kurum rolleri (`Role`) veritabanında ayrı tablolar olarak modellenmiştir. Aynı role birden fazla kullanıcı atanabilir.

| Rol Kodu | Kurum Adı | GRUP-1 | GRUP-2 | GRUP-3 | GRUP-4 | Excel İndirme | Excel İçe Aktarma & Yönetim |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `MTCHARITA` | **MTCHARİTA** | Tam Yetki | Tam Yetki | Tam Yetki | Tam Yetki | Bütün Gruplar | Yetkili |
| `NIL_PROJE` | **NİL PROJE** | Görüntüleme | **Düzenleme** *(Mevcut Kayıt)* | Görüntüleme | Görüntüleme | Bütün Gruplar | Yetkisiz |
| `TKGM` | **TKGM** | Görüntüleme | Görüntüleme | Görüntüleme | Görüntüleme | Bütün Gruplar | Yetkisiz |

---

## 3. Kurulum ve Yerelde Çalıştırma

### Gereksinimler
- **Node.js** `v20+` (Önerilen: `v22` veya `v24`)
- **npm** `v10+`

### 1. Ortam Değişkenlerini Hazırlayın
Proje kök dizinindeki `.env.example` dosyasını `.env` olarak kopyalayın:

```powershell
Copy-Item .env.example .env
```

Gerekli değişkenler:
- `DATABASE_URL`: Yerel geliştirme için `file:./dev.db` (SQLite) hazır yapılandırılmıştır.
- `SESSION_SECRET`: JWT oturum çerezlerini imzalamak için kullanılan gizli anahtar.
- `SEED_MTCHARITA_PASSWORD`, `SEED_NILPROJE_PASSWORD`, `SEED_TKGM_PASSWORD`: İlk kurulumda oluşturulacak varsayılan test hesaplarının şifreleri.

### 2. Bağımlılıkları ve Veritabanını Kurun

```powershell
npm install
npm run db:push
npm run db:seed
```

> **Not:** `npm run db:seed` komutu `data/seed-excels/` klasöründeki `GRUP-1.xlsx`, `GRUP-2.xlsx`, `GRUP-3.xlsx` ve `GRUP-4.xlsx` dosyalarını doğrular ve toplam **468** mahalle/birim kaydını veritabanına aktarır. Tekrar çalıştırıldığında mevcut kayıtları ve kullanıcı değişikliklerini ezmez.

### 3. Geliştirme Sunucusunu Başlatın

```powershell
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

---

## 4. Yerel Geliştirme Kullanıcı Hesapları

İlk kurulum (`db:seed`) sonrasında aşağıdaki kurumsal hesaplarla giriş yapabilirsiniz (`.env` içinde tanımlı varsayılan şifrelerle):

| Kurum Rolü | Kullanıcı Adı | E-posta | Varsayılan Şifre (`.env`) |
| :--- | :--- | :--- | :--- |
| **MTCHARİTA** *(Yönetici)* | `mtcharita` | `yonetim@mtcharita.com.tr` | `Mtc2026!` |
| **NİL PROJE** *(Grup-2 Düzenleme)* | `nilproje` | `uzman@nilproje.com.tr` | `Nil2026!` |
| **TKGM** *(Salt Okunur)* | `tkgm` | `kontrol@tkgm.gov.tr` | `Tkgm2026!` |

---

## 5. Test ve Doğrulama Komutları

Yetkilendirme kurallarını, sınır aşımı (cross-group IDOR) korumalarını, sürüm çakışması (optimistic concurrency) kontrolünü ve Excel içe/dışa aktarma veri bütünlüğünü doğrulamak için:

```powershell
# Otomatik test paketini çalıştır (Vitest)
npm test

# TypeScript tip kontrolünü çalıştır
npm run lint

# Üretim (Production) derlemesini doğrula
npm run build
```
