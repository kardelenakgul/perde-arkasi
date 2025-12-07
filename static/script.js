let authModal, girisKayitBtn, cikisBtn, kullaniciAdiGoster, hosgeldinizAlani, girisFormuAlani, kapatModalBtn;
let filmListesi, aramaFormu, aramaInput, filmListesiBasligi;
let duzenlenenIdInput;
let slideIndex = 0;
let slideInterval;

// =================================================================================
// DOMContentLoaded: SAYFA YÜKLENDİĞİNDE ÇALIŞACAK KODLAR
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {

    // 1. HTML ELEMANLARINI TANIMLA
    filmListesi = document.getElementById('film-listesi');
    aramaFormu = document.getElementById('arama-formu');
    aramaInput = document.getElementById('arama-input');
    filmListesiBasligi = document.querySelector('main h2');
    
    authModal = document.getElementById('auth-modal');
    girisKayitBtn = document.getElementById('giris-kayit-btn');
    cikisBtn = document.getElementById('cikis-btn');
    kullaniciAdiGoster = document.getElementById('kullanici-adi-goster');
    hosgeldinizAlani = document.getElementById('hosgeldiniz-alani');
    girisFormuAlani = document.getElementById('giris-formu-alani');
    kapatModalBtn = document.querySelector('#auth-modal .kapat-modal');

    duzenlenenIdInput = document.getElementById('duzenlenen-film-id');

    // 2. KULLANICI İŞLEMLERİ (Giriş/Çıkış)
    if (girisKayitBtn) {
        girisKayitBtn.addEventListener('click', () => {
            if(authModal) authModal.style.display = 'flex';
            formuGoster('giris'); 
        });
    }

    if (cikisBtn) {
        cikisBtn.addEventListener('click', cikisYap);
    }
    
    if (kapatModalBtn) {
        kapatModalBtn.addEventListener('click', () => {
            if(authModal) authModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            if(authModal) authModal.style.display = 'none';
        }
    });

    // 3. FAVORİLERİM BUTONU
    const favorilerimBtn = document.getElementById('favorilerim-btn');
    if (favorilerimBtn) {
        favorilerimBtn.addEventListener('click', favorileriYukle);
    }

    // 4. ARAMA FORMU
    if (aramaFormu) {
        aramaFormu.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const sorgu = aramaInput.value;
            if (sorgu.trim()) {
                filmleriGetir(sorgu);
            } else {
                filmleriGetir();
            }
        });
    }

    // 5. ADMIN FİLM EKLEME FORMU
    const kendiFilmFormu = document.getElementById('kendi-film-formu');
    if (kendiFilmFormu) {
        kendiFilmFormu.addEventListener('submit', (e) => {
            e.preventDefault();
            const filmVerisi = {
                baslik: document.getElementById('kendi-baslik').value,
                tip: document.getElementById('kendi-tip').value, 
                kategori: document.getElementById('kendi-kategori').value, 
                poster_url: document.getElementById('kendi-poster').value,
                puan: parseFloat(document.getElementById('kendi-puan').value) || 0.0,
                yayin_tarihi: document.getElementById('kendi-yil').value || 'Bilinmiyor',
                oyuncular: document.getElementById('kendi-oyuncular').value || 'Oyuncu bilgisi girilmedi',
                ozet: document.getElementById('kendi-ozet').value || 'Özet girilmedi.'
            };
            const duzenlenenId = duzenlenenIdInput.value; 
            if (duzenlenenId) filmDuzenle(duzenlenenId, filmVerisi);
            else kendiFilmEkle(filmVerisi);
        });
    }

    // 6. KÜÇÜK KARTLAR İÇİN DİNAMİK FAVORİ BUTONU DİNLEYİCİSİ (Event Delegation)
    // Bu yöntem, kartlar sonradan yüklense bile butonların çalışmasını sağlar.
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('kucuk-liste-ekle-btn')) {
            e.preventDefault();
            e.stopPropagation(); // Kartın detayını açmasını engeller
            const filmId = e.target.getAttribute('data-film-id');
            favoriEkleIstegi(filmId);
        }
    });

    // 7. UYGULAMAYI BAŞLAT
    filmleriGetir(); 
    kullaniciDurumunuKontrolEt();

}); // --- DOMContentLoaded SONU ---


// =================================================================================
// YARDIMCI FONKSİYON: Ortak Favori Ekleme İsteği
// =================================================================================
async function favoriEkleIstegi(filmId) {
    if (!filmId) { alert('Film ID bulunamadı.'); return; }
    try {
        const response = await fetch(`/api/favori/ekle/${filmId}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (response.status === 401) alert('Lütfen listeye eklemek için önce giriş yapın!');
        else alert(data.mesaj);
    } catch (error) {
        console.error('Hata:', error);
        alert('Bir hata oluştu.');
    }
}

// Bu fonksiyonu global scope'a (window) ekleyelim ki Slider içindeki onclick çalışsın
window.favoriEkleIstegi = favoriEkleIstegi;


// =================================================================================
// SLIDER (KAYDIRICI) FONKSİYONLARI
// =================================================================================
function slideriBaslat(filmler) {
    const heroSection = document.getElementById('hero-section');
    if (!heroSection || filmler.length === 0) return;

    heroSection.innerHTML = '';
    if (slideInterval) clearInterval(slideInterval);

    filmler.forEach((film, index) => {
        const slide = document.createElement('div');
        slide.classList.add('hero-slide');
        if (index === 0) slide.classList.add('active');
        
        slide.style.backgroundImage = `url('${film.poster_path}')`;

        slide.innerHTML = `
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1 class="hero-title">${film.title}</h1>
                <div class="hero-meta">
                    <span class="hero-tag imdb">IMDb ${film.vote_average}</span>
                    <span class="hero-tag">${film.release_date}</span>
                    <span class="hero-tag">${film.type.toUpperCase()}</span>
                </div>
                <p class="hero-desc">${film.overview || 'Özet bulunmuyor.'}</p>
                <div class="hero-buttons">
                     <button class="hero-btn liste-ekle-btn" onclick="favoriEkleIstegi(${film.id})">+ Listeme Ekle</button>
                </div>
            </div>
        `;
        heroSection.appendChild(slide);
    });

    // Ok Tuşları
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&#10094;'; 
    prevBtn.className = 'slider-btn prev-btn';
    prevBtn.onclick = () => changeSlide(-1);

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&#10095;';
    nextBtn.className = 'slider-btn next-btn';
    nextBtn.onclick = () => changeSlide(1);

    heroSection.appendChild(prevBtn);
    heroSection.appendChild(nextBtn);

    const slides = document.querySelectorAll('.hero-slide');
    window.changeSlide = function(n) {
        slides[slideIndex].classList.remove('active');
        slideIndex = (slideIndex + n + slides.length) % slides.length;
        slides[slideIndex].classList.add('active');
    };

    // Otomatik Döndürme (5 Saniye)
    slideInterval = setInterval(() => { changeSlide(1); }, 5000);
}


// =================================================================================
// ANA VERİ ÇEKME VE GÖSTERME
// =================================================================================
async function filmleriGetir(sorgu = null) {
    const durumResponse = await fetch('/api/kullanici-durumu');
    const kullaniciDurumu = await durumResponse.json();
    const isAdmin = kullaniciDurumu.is_admin;
    
    const adminFilmAlani = document.getElementById('kendi-film-ekle-alani');
    if (adminFilmAlani) adminFilmAlani.style.display = isAdmin ? 'block' : 'none';
    
    let apiYolu = '/api/filmler/hepsi';
    let baslikMetni = "Kendi Film Listeniz";

    if (sorgu) {
        apiYolu = `/api/filmler/ara?q=${encodeURIComponent(sorgu)}`;
        baslikMetni = `"${sorgu}" için Arama Sonuçları`;
    }

    try {
        const response = await fetch(apiYolu); 
        if (!response.ok) throw new Error(`HTTP Hata: ${response.status}`);
        const filmler = await response.json(); 
        
        if (filmListesiBasligi) filmListesiBasligi.textContent = baslikMetni;
        
        // Slider Mantığı: Arama yoksa ilk 5 filmi slider'a koy
        if (filmler.length > 0 && !sorgu) {
            slideriBaslat(filmler.slice(0, 5));
            document.getElementById('hero-section').style.display = 'block';
        } else if (sorgu) {
            document.getElementById('hero-section').style.display = 'none';
        }
        
        filmleriGoster(filmler, isAdmin); 

    } catch (error) {
        console.error("Hata:", error);
        const dinamikKonteyner = document.getElementById('dinamik-film-gruplari');
        if (dinamikKonteyner) dinamikKonteyner.innerHTML = `<p style="color:red;">Veriler yüklenirken hata oluştu.</p>`;
    }
}


function filmleriGoster(filmler, isAdmin) {
    const detayKutusu = document.getElementById('film-detay');
    const mainElement = document.querySelector('main');
    let yeniListeKonteyneri = document.getElementById('dinamik-film-gruplari');
    
    if (yeniListeKonteyneri) {
        yeniListeKonteyneri.innerHTML = '';
    } else {
        yeniListeKonteyneri = document.createElement('div');
        yeniListeKonteyneri.id = 'dinamik-film-gruplari';
        const eskiFilmListesi = document.getElementById('film-listesi');
        if (eskiFilmListesi) eskiFilmListesi.remove();
        mainElement.appendChild(yeniListeKonteyneri);
    }
    
    if (detayKutusu) detayKutusu.style.display = 'none'; 

    if (filmler.length === 0) {
        yeniListeKonteyneri.innerHTML = `<p style="color:#f5c518; font-size: 1.2em;">Film bulunamadı.</p>`;
        return;
    }

    const gruplanmisFilmler = filmler.reduce((gruplar, film) => {
        const kategori = film.genre || 'Genel';
        if (!gruplar[kategori]) gruplar[kategori] = [];
        gruplar[kategori].push(film);
        return gruplar;
    }, {});

    Object.keys(gruplanmisFilmler).forEach(kategori => {
        const kategoriBaslik = document.createElement('h2');
        kategoriBaslik.textContent = `${kategori} Dizi ve Filmleri`;
        yeniListeKonteyneri.appendChild(kategoriBaslik);

        const kategoriFilmListesi = document.createElement('div');
        kategoriFilmListesi.classList.add('film-listesi-grup'); 
        kategoriFilmListesi.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; padding: 10px 0;';

        gruplanmisFilmler[kategori].forEach(film => {
            const filmKarti = document.createElement('div');
            filmKarti.classList.add('film-karti');
            filmKarti.setAttribute('data-film-id', film.id); 

            const posterYolu = film.poster_path; 
            
            let adminButonHTML = '';
            if (isAdmin) {
                adminButonHTML = `
                    <div class="admin-kontrol">
                        <button class="duzenle-btn" data-film-id="${film.id}" style="background-color: #007bff;">Düzenle</button>
                        <button class="sabitle-btn kaldir-btn" data-film-id="${film.id}" style="background-color: darkred;">Kalıcı Sil</button>
                    </div>
                `;
            }

            // --- KART İÇERİĞİ (TEK LİSTE BUTONU VE ADMIN BUTONLARI) ---
            filmKarti.innerHTML = `
                <img src="${posterYolu}" alt="${film.title}">
                <div class="film-bilgi">
                    <h3>${film.title} <span style="font-size: 0.7em; color: #ccc;">(${film.type.toUpperCase()})</span></h3>
                    <span class="oy-puani">${(film.vote_average || 0.0).toFixed(1)}</span> 
                </div>
                
                <button class="kucuk-liste-ekle-btn" data-film-id="${film.id}">+ Listeme Ekle</button>
                
                ${adminButonHTML}
            `;
            
            // KART TIKLAMA (DETAY AÇMA)
            filmKarti.addEventListener('click', (e) => {
                // Eğer butonlara basıldıysa detayı açma
                if (e.target.closest('.admin-kontrol') || e.target.tagName === 'BUTTON' || e.target.classList.contains('kucuk-liste-ekle-btn')) {
                    return; 
                }
                filmDetaylariniGoster(film); 
            });
            
            kategoriFilmListesi.appendChild(filmKarti);
        });
        yeniListeKonteyneri.appendChild(kategoriFilmListesi);
    });
    
    // Admin butonları (Düzenle/Sil) dinleyicileri
    if (isAdmin) {
        document.querySelectorAll('.kaldir-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                filmKalıcıSil(btn.getAttribute('data-film-id'), e.target.closest('.film-karti'));
            });
        });
        document.querySelectorAll('.duzenle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filmId = btn.getAttribute('data-film-id');
                // Basitçe mevcut listeyi tarayıp buluyoruz (API'ye tekrar gitmeye gerek yok)
                fetch('/api/filmler/hepsi').then(r=>r.json()).then(data=>{
                     const film = data.find(f => String(f.id) === String(filmId));
                     if(film) formuDuzenleModunaGecir(film);
                });
            });
        });
    }
}


// =================================================================================
// DETAY SAYFASI (İZLE BUTONU YOK)
// =================================================================================
function filmDetaylariniGoster(detay) {
    const detayKutusu = document.getElementById('film-detay');
    const dinamikKonteyner = document.getElementById('dinamik-film-gruplari');
    const filmListesiBasligi = document.querySelector('main h2');
    
    if (!detayKutusu) return; 

    // Sayfayı temizle
    if (dinamikKonteyner) dinamikKonteyner.style.display = 'none';
    if (filmListesiBasligi) filmListesiBasligi.style.display = 'none';
    document.getElementById('hero-section').style.display = 'none'; // Slider'ı da gizle

    detayKutusu.innerHTML = `
        <div class="detay-resim">
            <img src="${detay.poster_path}" alt="${detay.title}">
        </div>
        <div class="detay-bilgi">
            <h2>${detay.title} (${detay.release_date || 'Bilinmiyor'})</h2>
            <p><span>Türü:</span> ${detay.type || '?'}</p>
            <p><span>Kategori:</span> ${detay.genre || 'Genel'}</p>
            <p><span>Puan:</span> ${(detay.vote_average || 0.0).toFixed(1)} / 10</p>
            <p><span>Oyuncular:</span> ${detay.actors || 'Bilgi yok.'}</p>
            <p><span>Özet:</span> ${detay.overview || 'Özet yok.'}</p>
            
            <button class="kapat-butonu">Listeye Geri Dön</button>
            <hr style="margin: 25px 0; border-color: #444;">
            
            <h3>Yorumunuzu ve Puanınızı Ekleyin</h3>
            <form id="yorum-formu" data-film-id="${detay.id}">
                <div class="form-satir">
                    <input type="text" id="kullanici-ad" placeholder="Adınız" required>
                </div>
                <div class="form-satir">
                    <textarea id="yorum-metni" placeholder="Yorumunuzu buraya yazın..." required></textarea>
                </div>
                <div class="form-satir puan-satir">
                    <label>Puanınız (1-10):</label>
                    <input type="number" id="puan-input" min="1" max="10" value="8" required>
                    <button type="submit" class="gonder-butonu">Yorumu Gönder</button>
                </div>
            </form>
            <hr>
            <h3>Kullanıcı Yorumları</h3>
            <div id="yorumlar-alani-dinamik"></div>
        </div>
    `;

    // Kapatma Butonu
    document.querySelector('.kapat-butonu').addEventListener('click', () => {
        detayKutusu.style.display = 'none';
        if (dinamikKonteyner) dinamikKonteyner.style.display = 'block';
        if (filmListesiBasligi) filmListesiBasligi.style.display = 'block';
        // Eğer arama yapılmıyorsa slider'ı geri getir
        const aramaInputu = document.getElementById('arama-input');
        if (!aramaInputu.value) document.getElementById('hero-section').style.display = 'block';
        window.scrollTo(0, 0); 
    });

    // Yorum Formu
    const yorumFormu = document.getElementById('yorum-formu');
    if (yorumFormu) {
        yorumFormu.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const filmId = yorumFormu.getAttribute('data-film-id');
            const puan = document.getElementById('puan-input').value;
            const yorumMetni = document.getElementById('yorum-metni').value;
            if (parseInt(puan) < 1 || parseInt(puan) > 10) {
                alert('Puan 1-10 arasında olmalı.'); return;
            }
            yorumGonder(filmId, puan, yorumMetni); 
        });
    }

    detayKutusu.style.display = 'flex';
    window.scrollTo(0, 0);
    yorumlariYukle(detay.id);
    kullaniciDurumunuKontrolEt(); 
}

// =================================================================================
// DİĞER YARDIMCI FONKSİYONLAR (Admin, Yorum, Auth vb.)
// =================================================================================

async function yorumGonder(filmId, puan, yorumMetni) {
    const response = await fetch('/api/yorum-gonder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ film_id: filmId, puan: parseInt(puan), yorum_metni: yorumMetni }) 
    });
    if (response.ok) {
        alert('Yorum gönderildi!');
        document.getElementById('yorum-formu').reset(); 
        yorumlariYukle(filmId); 
    } else { alert('Yorum gönderilemedi. Giriş yaptınız mı?'); }
}

async function yorumlariYukle(filmId) {
    const alan = document.getElementById('yorumlar-alani-dinamik');
    if (!alan) return;
    alan.innerHTML = '<h4>Yükleniyor...</h4>';
    
    const durum = await (await fetch('/api/kullanici-durumu')).json();
    const res = await fetch(`/api/yorum-cek/${filmId}`);
    const yorumlar = await res.json();
    
    alan.innerHTML = '';
    if (yorumlar.length === 0) { alan.innerHTML = '<p>Henüz yorum yok.</p>'; return; }

    yorumlar.forEach(y => {
        const div = document.createElement('div');
        div.className = 'yorum-karti';
        let btn = '';
        if (durum.is_admin) btn = `<button class="sil-btn" onclick="yorumSil(${y.id}, ${filmId})">Sil</button>`;
        
        div.innerHTML = `
            <div style="overflow: hidden;">${btn}<h4>${y.kullanici}</h4></div>
            <span style="color: orange; font-weight: bold;">Puan: ${y.puan}/10</span>
            <p>${y.yorum_metni}</p>
        `;
        alan.appendChild(div);
    });
}

async function yorumSil(yId, fId) {
    if(confirm('Silinsin mi?')) {
        await fetch(`/api/yorum-sil/${yId}`, {method:'DELETE'});
        yorumlariYukle(fId);
    }
}

// Favorileri Göster
async function favorileriYukle() {
    const dinamikKonteyner = document.getElementById('dinamik-film-gruplari');
    const detayKutusu = document.getElementById('film-detay');
    if (!dinamikKonteyner) return;

    dinamikKonteyner.style.display = 'block';
    detayKutusu.style.display = 'none';
    document.getElementById('hero-section').style.display = 'none';

    const baslik = document.querySelector('main h2');
    if(baslik) baslik.textContent = "⭐ Favori Listem";
    dinamikKonteyner.innerHTML = '<p>Yükleniyor...</p>';

    const durum = await (await fetch('/api/kullanici-durumu')).json();
    if (!durum.giris_yapildi) {
        dinamikKonteyner.innerHTML = '<p style="color:red;">Giriş yapmalısınız.</p>'; return;
    }

    const res = await fetch('/api/favorilerim');
    const favoriler = await res.json();
    
    if (favoriler.length === 0) dinamikKonteyner.innerHTML = '<p>Listeniz boş.</p>';
    else filmleriGoster(favoriler, durum.is_admin);
}

// CRUD İşlemleri
async function kendiFilmEkle(data) {
    const res = await fetch('/api/film/ekle', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    const json = await res.json();
    alert(json.mesaj || json.hata);
    if(res.ok) { document.getElementById('kendi-film-formu').reset(); filmleriGetir(); }
}

async function filmDuzenle(id, data) {
    const res = await fetch(`/api/film/duzenle/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    const json = await res.json();
    alert(json.mesaj || json.hata);
    if(res.ok) { 
        document.getElementById('kendi-film-formu').reset(); 
        document.getElementById('duzenlenen-film-id').value = '';
        document.querySelector('#kendi-film-ekle-alani h3').textContent = '🎬 Yeni Film Ekle (Admin)';
        filmleriGetir(); 
    }
}

async function filmKalıcıSil(id, el) {
    if(!confirm('Kalıcı silinsin mi?')) return;
    const res = await fetch(`/api/film/sil/${id}`, {method:'DELETE'});
    if(res.ok) { el.remove(); filmleriGetir(); } 
    else alert('Silinemedi.');
}

function formuDuzenleModunaGecir(f) {
    document.getElementById('duzenlenen-film-id').value = f.id;
    document.getElementById('kendi-baslik').value = f.title;
    document.getElementById('kendi-poster').value = f.poster_path;
    document.getElementById('kendi-tip').value = f.type;
    document.getElementById('kendi-kategori').value = f.genre;
    document.getElementById('kendi-puan').value = f.vote_average;
    document.getElementById('kendi-yil').value = f.release_date;
    document.getElementById('kendi-oyuncular').value = f.actors || '';
    document.getElementById('kendi-ozet').value = f.overview;
    document.querySelector('#kendi-film-ekle-alani h3').textContent = `Düzenle: ${f.title}`;
    window.scrollTo(0,0);
}

// Auth İşlemleri
async function kayitOl(k, p) {
    const res = await fetch('/api/kayit', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({kullanici_adi:k, parola:p})});
    const d = await res.json();
    alert(d.mesaj || d.hata);
    if(res.ok) formuGoster('giris');
}

async function girisYap(k, p) {
    const res = await fetch('/api/giris', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({kullanici_adi:k, parola:p})});
    const d = await res.json();
    alert(d.mesaj || d.hata);
    if(res.ok) { authModal.style.display = 'none'; kullaniciDurumunuKontrolEt(); }
}

async function cikisYap() {
    await fetch('/api/cikis', {method:'POST'});
    filmleriGetir();
    kullaniciDurumunuKontrolEt();
}

function formuGoster(tip) {
    const baslik = tip === 'giris' ? 'Giriş Yap' : 'Kayıt Ol';
    const linkText = tip === 'giris' ? 'Kayıt Ol' : 'Giriş Yap';
    const targetTip = tip === 'giris' ? 'kayit' : 'giris';
    
    girisFormuAlani.innerHTML = `
        <form class="auth-form" id="dynamic-auth-form">
            <h3>${baslik}</h3>
            <input type="text" id="k-adi" placeholder="Kullanıcı Adı" required>
            <input type="password" id="k-parola" placeholder="Parola" required>
            <button type="submit">${baslik}</button>
            <span class="auth-link" onclick="formuGoster('${targetTip}')">${linkText}</span>
        </form>
    `;
    document.getElementById('dynamic-auth-form').addEventListener('submit', (e)=>{
        e.preventDefault();
        const k = document.getElementById('k-adi').value;
        const p = document.getElementById('k-parola').value;
        if(tip==='giris') girisYap(k,p); else kayitOl(k,p);
    });
}

async function kullaniciDurumunuKontrolEt() {
    const res = await fetch('/api/kullanici-durumu');
    const d = await res.json();
    
    if(d.giris_yapildi) {
        girisKayitBtn.style.display = 'none';
        hosgeldinizAlani.style.display = 'flex';
        kullaniciAdiGoster.textContent = `Hoş geldin, ${d.kullanici_adi}`;
        const adminPanel = document.getElementById('admin-panel-btn');
        const adminForm = document.getElementById('kendi-film-ekle-alani');
        if(adminPanel) adminPanel.style.display = d.is_admin ? 'block' : 'none';
        if(adminForm) adminForm.style.display = d.is_admin ? 'block' : 'none';
        
        // Yorum formunda ad gizle
        const kAdInput = document.getElementById('kullanici-ad');
        if(kAdInput) { kAdInput.value = d.kullanici_adi; kAdInput.style.display = 'none'; }
    } else {
        girisKayitBtn.style.display = 'block';
        hosgeldinizAlani.style.display = 'none';
        const adminForm = document.getElementById('kendi-film-ekle-alani');
        if(adminForm) adminForm.style.display = 'none';
        const kAdInput = document.getElementById('kullanici-ad');
        if(kAdInput) kAdInput.style.display = 'block';
    }
}