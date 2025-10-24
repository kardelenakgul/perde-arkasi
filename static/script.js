// =================================================================================
// static/script.js DOSYASININ TAM VE EKSİKSİZ İÇERİĞİ
// =================================================================================

// ----------------------------------------------------
// TEMEL SABİTLER (SADECE BİR KEZ TANIMLANDILAR)
// ----------------------------------------------------//
const API_KEY = "2fc4c932f89a745404359bd62f8d0094"; // SADECE BİR KEZ TANIMLANDI
const BASE_URL = "https://api.themoviedb.org/3";
const POPULAR_MOVIES_URL = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=tr-TR&page=1`;
const ARAMA_URL = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=tr-TR&query=`;

// ----------------------------------------------------
// HTML'in Yüklenmesini Bekle ve Başlat (DOMContentLoaded Bloğu)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    // HTML ELEMANLARINI SEÇME
    const filmListesi = document.getElementById('film-listesi');
    const aramaFormu = document.getElementById('arama-formu');
    const aramaInput = document.getElementById('arama-input');
    const filmListesiBasligi = document.querySelector('main h2'); // Hata vermemesi için burada seçelim

    // ----------------------------------------------------
    // UYGULAMAYI BAŞLATMA
    // ----------------------------------------------------
    filmleriGetir(POPULAR_MOVIES_URL);

    // ----------------------------------------------------
    // ARAMA FORMU İŞLEVSELLİĞİ
    // ----------------------------------------------------
    if (aramaFormu) { // Formun varlığını kontrol ediyoruz (hata vermemek için)
        aramaFormu.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const aramaSorgusu = aramaInput.value;
            
            if (aramaSorgusu) {
                filmleriGetir(ARAMA_URL + aramaSorgusu);
                aramaInput.value = ''; 
            } else {
                filmleriGetir(POPULAR_MOVIES_URL);
            }
        });
    } else {
        console.warn("Arama formu bulunamadı. Lütfen index.html'deki ID'yi kontrol edin.");
    }
}); // DOMContentLoaded BİTİŞİ

// =================================================================================
// FONKSİYONLAR (Bu kısım DOMContentLoaded dışında kalmalı)
// =Ğ================================================================================

// ----------------------------------------------------
// FONKSİYON 1: API'dan Verileri Çekme
// ----------------------------------------------------
async function filmleriGetir(url) {
    const filmListesi = document.getElementById('film-listesi');
    if (!filmListesi) return; // Liste yoksa dur

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Hata kodu: ${response.status}`);
        }
        const data = await response.json();
        filmleriGoster(data.results);
    } catch (error) {
        console.error("Film verileri çekilirken hata oluştu:", error);
        filmListesi.innerHTML = `<p style="color:red;">Veriler yüklenirken bir sorun oluştu. API anahtarınızı kontrol edin veya TMDB'de sorun olabilir.</p>`;
    }
}

// ----------------------------------------------------
// FONKSİYON 2: Çekilen Filmleri HTML'e Ekleme
// ----------------------------------------------------
function filmleriGoster(filmler) {
    const filmListesi = document.getElementById('film-listesi');
    const detayKutusu = document.getElementById('film-detay');
    if (!filmListesi) return;

    filmListesi.innerHTML = ''; 
    if (detayKutusu) detayKutusu.style.display = 'none'; 

    filmler.forEach(film => {
        const filmKarti = document.createElement('div');
        filmKarti.classList.add('film-karti');
        filmKarti.setAttribute('data-film-id', film.id);

        const posterYolu = film.poster_path 
            ? `https://image.tmdb.org/t/p/w500${film.poster_path}`
            : 'placeholder.png';

        filmKarti.innerHTML = `
            <img src="${posterYolu}" alt="${film.title} Posteri">
            <div class="film-bilgi">
                <h3>${film.title}</h3>
                <span class="oy-puani">${film.vote_average.toFixed(1)}</span> 
            </div>
        `;
        
        filmKarti.addEventListener('click', () => {
            const filmId = filmKarti.getAttribute('data-film-id');
            filmDetaylariniGetir(filmId);
        });
        
        filmListesi.appendChild(filmKarti);
    });
}

// ----------------------------------------------------
// FONKSİYON 3: Detay Bilgilerini API'dan Çekme
// ----------------------------------------------------
async function filmDetaylariniGetir(filmId) {
    const DETAY_URL = `${BASE_URL}/movie/${filmId}?api_key=${API_KEY}&language=tr-TR`;
    
    try {
        const response = await fetch(DETAY_URL);
        const detayData = await response.json();
        
        filmDetaylariniGoster({ ...detayData, id: filmId });
        
    } catch (error) {
        console.error("Film detayları çekilirken hata oluştu:", error);
    }
}

// ----------------------------------------------------
// FONKSİYON 4: Detay Bilgilerini Ekrana Yazma
// ----------------------------------------------------
function filmDetaylariniGoster(detay) {
    const detayKutusu = document.getElementById('film-detay');
    const filmListesi = document.getElementById('film-listesi');
    const filmListesiBasligi = document.querySelector('main h2');
    if (!detayKutusu || !filmListesi) return;

    const baslangicPosterYolu = detay.poster_path 
        ? `https://image.tmdb.org/t/p/w500${detay.poster_path}`
        : 'placeholder.png';

    // Film listesini ve başlığını gizle
    filmListesi.style.display = 'none';
    if (filmListesiBasligi) filmListesiBasligi.style.display = 'none';

    // Detay HTML içeriğini oluştur
    detayKutusu.innerHTML = `
        <div class="detay-resim">
            <img src="${baslangicPosterYolu}" alt="${detay.title} Posteri">
        </div>
        <div class="detay-bilgi">
            <h2>${detay.title} (${detay.release_date.substring(0, 4)})</h2>
            <p><span>Puan:</span> ${detay.vote_average.toFixed(1)} / 10 (${detay.vote_count} oy)</p>
            <p><span>Türler:</span> ${detay.genres.map(g => g.name).join(', ')}</p>
            <p><span>Süre:</span> ${detay.runtime} dakika</p>
            <p><span>Özet:</span> ${detay.overview}</p>
            
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
                    <label for="puan">Puanınız (1-10):</label>
                    <input type="number" id="puan-input" min="1" max="10" value="8" required>
                    <button type="submit" class="gonder-butonu">Yorumu Gönder</button>
                </div>
            </form>

            <hr>
            <h3>Kullanıcı Yorumları</h3>
            <div id="yorumlar-alani-dinamik">
                </div>
        </div>
    `;

    // Kapatma butonu işlevselliği
    document.querySelector('.kapat-butonu').addEventListener('click', () => {
        detayKutusu.style.display = 'none';
        filmListesi.style.display = 'grid';
        if (filmListesiBasligi) filmListesiBasligi.style.display = 'block';
    });

    // YORUM FORMU İŞLEVSELLİĞİ
    const yorumFormu = document.getElementById('yorum-formu');
    if (yorumFormu) {
        yorumFormu.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const filmId = yorumFormu.getAttribute('data-film-id');
            const kullanici = document.getElementById('kullanici-ad').value;
            const puan = document.getElementById('puan-input').value;
            const yorumMetni = document.getElementById('yorum-metni').value;

            if (parseInt(puan) < 1 || parseInt(puan) > 10) {
                alert('Lütfen 1 ile 10 arasında bir puan girin.');
                return;
            }
            yorumGonder(filmId, kullanici, puan, yorumMetni);
            yorumFormu.reset(); 
        });
    }

    // Detay kutusunu göster ve yorumları çek
    detayKutusu.style.display = 'flex';
    window.scrollTo(0, 0);
    yorumlariYukle(detay.id);
}

// ----------------------------------------------------
// FONKSİYON 5: Yorumu Python Sunucusuna Gönderme
// ----------------------------------------------------
async function yorumGonder(filmId, kullanici, puan, yorumMetni) {
    const response = await fetch('/api/yorum-gonder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            film_id: filmId,
            kullanici: kullanici,
            puan: parseInt(puan),
            yorum_metni: yorumMetni
        })
    });

    if (response.ok) {
        alert('Yorumunuz başarıyla gönderildi!');
        yorumlariYukle(filmId); 
    } else {
        alert('Yorum gönderilirken hata oluştu. Sunucuyu (Flask) kontrol edin.');
    }
}

// ----------------------------------------------------
// FONKSİYON 6: Python Sunucusundan Yorumları Çekme ve Gösterme
// ----------------------------------------------------
async function yorumlariYukle(filmId) {
    const yorumlarAlani = document.getElementById('yorumlar-alani-dinamik');
    if (!yorumlarAlani) return;

    yorumlarAlani.innerHTML = '<h4>Yorumlar yükleniyor...</h4>';

    const response = await fetch(`/api/yorum-cek/${filmId}`);
    const yorumlar = await response.json();
    
    yorumlarAlani.innerHTML = '';

    if (yorumlar.length === 0) {
        yorumlarAlani.innerHTML = '<p>Henüz bu film için yorum yapılmamış. İlk yorumu siz yapın!</p>';
        return;
    }

    yorumlar.forEach(yorum => {
        const yorumKarti = document.createElement('div');
        yorumKarti.classList.add('yorum-karti');
        
        let puanRenk = 'green';
        if (yorum.puan < 5) puanRenk = 'red';
        else if (yorum.puan < 7) puanRenk = 'orange';

        yorumKarti.innerHTML = `
            <h4>${yorum.kullanici}</h4>
            <span style="color: ${puanRenk}; font-weight: bold; font-size: 1.1em;">Puan: ${yorum.puan}/10</span>
            <p>${yorum.yorum_metni}</p>
        `;
        yorumlarAlani.appendChild(yorumKarti);
    });
}