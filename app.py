from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_

# Flask uygulamasını başlat
app = Flask(__name__)

# Oturum yönetimi ve güvenlik ayarları
app.config['SECRET_KEY'] = 'sizin_cok_gizli_anahtariniz_degistirin_12345'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///yorumlar.db' 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# SQLAlchemy ve Flask-Login başlatma
db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'

# =========================================================================
# KULLANICI, YORUM, FİLM VE FAVORİ MODELLERİ
# =========================================================================

class Kullanici(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    kullanici_adi = db.Column(db.String(80), unique=True, nullable=False)
    parola_hash = db.Column(db.String(128), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False) 
    
    def set_parola(self, parola):
        self.parola_hash = generate_password_hash(parola)
        
    def check_parola(self, parola):
        return check_password_hash(self.parola_hash, parola)

    def __repr__(self):
        return f'<Kullanici {self.kullanici_adi}>'

class Yorum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    film_id = db.Column(db.String(50), nullable=False)
    kullanici = db.Column(db.String(80), nullable=False)
    puan = db.Column(db.Integer, nullable=False)
    yorum_metni = db.Column(db.Text, nullable=False)
    tarih = db.Column(db.DateTime, default=db.func.now())

    def __repr__(self):
        return f'<Yorum {self.id} - {self.film_id}>'

class Film(db.Model): 
    id = db.Column(db.Integer, primary_key=True)
    baslik = db.Column(db.String(255), nullable=False)
    tip = db.Column(db.String(10), default='film', nullable=False) 
    kategori = db.Column(db.String(50), default='Genel', nullable=False) 
    ozet = db.Column(db.Text)
    poster_url = db.Column(db.String(500)) 
    puan = db.Column(db.Float)
    yayin_tarihi = db.Column(db.String(10)) 
    oyuncular = db.Column(db.String(500), default='Oyuncu bilgisi girilmedi')

    def to_dict(self): 
        return {
            'id': self.id,
            'title': self.baslik,
            'type': self.tip,
            'genre': self.kategori,
            'overview': self.ozet,
            'poster_path': self.poster_url, 
            'vote_average': self.puan,
            'release_date': self.yayin_tarihi,
            'actors': self.oyuncular  # 👇 Frontend'e bu isimle göndereceğiz (Bunu ekle)
        }

    def __repr__(self):
        return f'<Film {self.baslik}>'

class Favori(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    kullanici_id = db.Column(db.Integer, db.ForeignKey('kullanici.id'), nullable=False)
    film_id = db.Column(db.Integer, db.ForeignKey('film.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('kullanici_id', 'film_id', name='_kullanici_film_uc'),)

    def __repr__(self):
        return f'<Favori Kullanici:{self.kullanici_id} Film:{self.film_id}>'


@login_manager.user_loader
def load_user(user_id):
    return Kullanici.query.get(int(user_id))

# =========================================================================
# FLASK YOLLARI VE API ENDPOINTLERİ (CRUD ODAKLI)
# =========================================================================

# TEMEL INDEX FONKSİYONU
@app.route("/")
def index():
    return render_template("index.html")

# ----------------------------------------------------
# 🎬 FİLM YÖNETİMİ API'LARI (READ, CREATE, UPDATE, DELETE)
# ----------------------------------------------------

# 1. READ: Tüm Filmleri Çekme (Ana Liste)
@app.route('/api/filmler/hepsi', methods=['GET'])
def filmleri_cek():
    try:
        # Hata ayıklama için try/except bloğu ekliyoruz
        filmler = Film.query.order_by(Film.id.desc()).all() 
        
        # Eğer filmler boşsa, boş bir liste döndürme
        if not filmler:
            return jsonify([]), 200
            
        return jsonify([film.to_dict() for film in filmler])

    except Exception as e:
        # Terminalde hatanın ne olduğunu görebilmek için yazdırıyoruz.
        print(f"Hata: Filmler çekilemedi. Detay: {e}")
        # Kullanıcıya 500 hatası döndürüyoruz
        return jsonify({'hata': 'Veritabanı bağlantı veya okuma hatası.'}), 500

# 2. CREATE: Yeni Film Ekleme (Admin)
@app.route('/api/film/ekle', methods=['POST'])
@login_required
def film_ekle():
    if not current_user.is_admin:
        return jsonify({'hata': 'Yetkiniz yok.'}), 403

    data = request.get_json()
    
    if not data.get('baslik') or not data.get('poster_url'):
         return jsonify({'hata': 'Başlık ve Poster URL zorunludur.'}), 400

    yeni_film = Film(
        baslik=data['baslik'],
        tip=data.get('tip', 'film'),
        kategori=data.get('kategori', 'Genel'),
        ozet=data.get('ozet', 'Özet girilmedi.'),
        poster_url=data['poster_url'],
        puan=data.get('puan', 0.0),
        yayin_tarihi=data.get('yayin_tarihi', 'Bilinmiyor'),
        oyuncular=data.get('oyuncular', 'Oyuncu bilgisi girilmedi')
    )
    
    try:
        db.session.add(yeni_film)
        db.session.commit()
        return jsonify({'mesaj': f"Film '{data['baslik']}' başarıyla eklendi!", 'id': yeni_film.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'hata': 'Veritabanı hatası.'}), 500

# 3. UPDATE: Film Düzenleme (Admin)
@app.route('/api/film/duzenle/<int:film_id>', methods=['PUT'])
@login_required
def film_duzenle(film_id):
    if not current_user.is_admin:
        return jsonify({'hata': 'Düzenleme yetkiniz yok.'}), 403

    film = Film.query.get(film_id)
    if not film:
        return jsonify({'hata': 'Film bulunamadı.'}), 404

    data = request.get_json()
    
    try:
        # Gelen tüm verileri kontrol edip güncelle
        film.baslik = data.get('baslik', film.baslik)
        film.tip = data.get('tip', film.tip)
        film.kategori = data.get('kategori', film.kategori)
        film.ozet = data.get('ozet', film.ozet)
        film.poster_url = data.get('poster_url', film.poster_url)
        film.puan = data.get('puan', film.puan)
        film.yayin_tarihi = data.get('yayin_tarihi', film.yayin_tarihi)
        film.oyuncular = data.get('oyuncular', film.oyuncular)

        db.session.commit()
        return jsonify({'mesaj': f"Film '{film.baslik}' başarıyla güncellendi!"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Film Düzenleme Hatası: {e}")
        return jsonify({'hata': 'Veritabanı güncelleme hatası.'}), 500

# 4. DELETE: Kalıcı Film Silme (Admin - Ödevin Anahtarı)
@app.route('/api/film/sil/<int:film_id>', methods=['DELETE'])
@login_required
def film_sil(film_id):
    if not current_user.is_admin:
        return jsonify({'hata': 'Kalıcı silme yetkiniz yok.'}), 403

    film = Film.query.get(film_id)
    if not film:
        return jsonify({'hata': 'Film bulunamadı.'}), 404

    try:
        # A. Bu filmin TÜM Yorumlarını Sil
        Yorum.query.filter_by(film_id=str(film_id)).delete()
        
        # B. Film kaydının kendisini veritabanından sil (Kalıcı Silme)
        db.session.delete(film)
        
        # C. Favori kayıtlarını sil
        Favori.query.filter_by(film_id=film_id).delete()
        
        db.session.commit()
        return '', 204 # Başarılı silme kodu (içerik yok)

    except Exception as e:
        db.session.rollback()
        print(f"Film Silme Hatası: {e}")
        return jsonify({'hata': 'Sunucu hatası. Silme başarısız.'}), 500

# 5. READ: Film Arama API'ı (Başlığa Göre)
@app.route('/api/filmler/ara', methods=['GET'])
def film_ara():
    # URL'den 'q' parametresini (arama sorgusu) al
    sorgu = request.args.get('q', '')
    
    # Sorgu boşsa tüm filmleri döndür
    if not sorgu:
        return redirect(url_for('filmleri_cek'))
        
    try:
        # Sorguyu küçük harfe çevir ve veritabanında "başlık" alanında arama yap
        # 'ilike' büyük/küçük harf duyarsız arama yapar.
        filmler = Film.query.filter(Film.baslik.ilike(f'%{sorgu}%')).all()
        
        return jsonify([film.to_dict() for film in filmler])

    except Exception as e:
        # Hata ayıklama için terminale yazdır
        print(f"Hata: Film arama başarısız oldu. Detay: {e}")
        return jsonify({'hata': 'Arama sırasında sunucu hatası.'}), 500        
# ----------------------------------------------------
# FAVORİ/LİSTE YÖNETİMİ
# ----------------------------------------------------
@app.route('/api/favori/ekle/<int:film_id>', methods=['POST'])
@login_required
def favori_ekle(film_id):
    if not current_user.is_authenticated:
        return jsonify({'hata': 'Bu özellik için giriş yapmalısınız.'}), 401

    if Film.query.get(film_id) is None:
        return jsonify({'hata': 'Film bulunamadı.'}), 404

    # Kullanıcının bu filmi daha önce ekleyip eklemediğini kontrol et
    if Favori.query.filter_by(kullanici_id=current_user.id, film_id=film_id).first():
        return jsonify({'mesaj': 'Film zaten listenizde!'}), 200

    yeni_favori = Favori(kullanici_id=current_user.id, film_id=film_id)
    
    try:
        db.session.add(yeni_favori)
        db.session.commit()
        return jsonify({'mesaj': 'Film listenize eklendi!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'hata': 'Veritabanı hatası.'}), 500
# ⭐ YENİ EKLEYECEĞİNİZ FAVORİ LİSTESİ API YOLU ⭐
@app.route('/api/favorilerim', methods=['GET'])
@login_required
def favorileri_cek():
    """Giriş yapmış kullanıcının tüm favori filmlerini döndürür."""
    try:
        favori_kayitlari = Favori.query.filter_by(kullanici_id=current_user.id).all()
        
        film_idleri = [kayit.film_id for kayit in favori_kayitlari]
        
        # Film modelinden ilgili filmleri çek
        favori_filmler = Film.query.filter(Film.id.in_(film_idleri)).all()
        
        return jsonify([film.to_dict() for film in favori_filmler])

    except Exception as e:
        print(f"Hata: Favoriler çekilemedi. Detay: {e}")
        return jsonify({'hata': 'Favori listesi çekilemedi.'}), 500
# ----------------------------------------------------
# 💬 YORUM API'LARI
# ----------------------------------------------------

@app.route('/api/yorum-gonder', methods=['POST'])
@login_required 
def yorum_gonder():
    if not request.is_json:
        return jsonify({'hata': 'JSON verisi bekleniyor'}), 400
        
    data = request.get_json()
    kullanici_adi = current_user.kullanici_adi 

    if not Film.query.get(int(data['film_id'])):
         return jsonify({'hata': 'Yorum yapılmak istenen film veritabanında yok.'}), 404

    yeni_yorum = Yorum(
        film_id=data['film_id'],
        kullanici=kullanici_adi,
        puan=data['puan'],
        yorum_metni=data['yorum_metni']
    )
    
    try:
        db.session.add(yeni_yorum)
        db.session.commit()
        return jsonify({'mesaj': 'Yorum başarıyla kaydedildi!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'hata': 'Veritabanı kaydı başarısız.'}), 500


@app.route('/api/yorum-cek/<film_id>', methods=['GET'])
def yorum_cek(film_id):
    yorumlar = Yorum.query.filter_by(film_id=film_id).order_by(Yorum.tarih.desc()).all()
    
    yorum_listesi = []
    for yorum in yorumlar:
        yorum_listesi.append({
            'id': yorum.id,
            'kullanici': yorum.kullanici,
            'puan': yorum.puan,
            'yorum_metni': yorum.yorum_metni,
            'tarih': yorum.tarih.strftime('%d/%m/%Y %H:%M')
        })
        
    return jsonify(yorum_listesi)

@app.route('/api/yorum-sil/<int:yorum_id>', methods=['DELETE']) 
@login_required
def yorum_sil(yorum_id):
    if not current_user.is_admin: 
        return jsonify({'hata': 'Yorum silme yetkiniz yok.'}), 403
    
    yorum = Yorum.query.get(yorum_id) 
    
    if not yorum:
        return jsonify({'hata': f'Yorum ID {yorum_id} bulunamadı.'}), 404
    
    try:
        db.session.delete(yorum)
        db.session.commit()
        return jsonify({'mesaj': 'Yorum başarıyla silindi.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'hata': 'Veritabanı silme işlemi başarısız.'}), 500

# ----------------------------------------------------
# 👤 KULLANICI YÖNETİMİ API'LARI
# ----------------------------------------------------
@app.route('/api/kayit', methods=['POST'])
def kayit():
    data = request.get_json()
    kullanici_adi = data.get('kullanici_adi')
    parola = data.get('parola')
    
    if Kullanici.query.filter_by(kullanici_adi=kullanici_adi).first():
        return jsonify({'hata': 'Bu kullanıcı adı zaten alınmış.'}), 400
        
    yeni_kullanici = Kullanici(kullanici_adi=kullanici_adi)
    yeni_kullanici.set_parola(parola)
    
    db.session.add(yeni_kullanici)
    db.session.commit()
    
    return jsonify({'mesaj': 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.'}), 201

@app.route('/api/giris', methods=['POST'])
def giris():
    data = request.get_json()
    kullanici_adi = data.get('kullanici_adi')
    parola = data.get('parola')
    
    kullanici = Kullanici.query.filter_by(kullanici_adi=kullanici_adi).first()
    
    if kullanici is None or not kullanici.check_parola(parola):
        return jsonify({'hata': 'Kullanıcı adı veya parola hatalı.'}), 401
    
    login_user(kullanici)
    return jsonify({'mesaj': 'Giriş başarılı!', 'kullanici_adi': kullanici_adi})

@app.route('/api/cikis', methods=['POST'])
@login_required 
def cikis():
    logout_user()
    return jsonify({'mesaj': 'Başarıyla çıkış yapıldı.'})

@app.route('/api/kullanici-durumu', methods=['GET'])
def kullanici_durumu():
    if current_user.is_authenticated:
        return jsonify({
            'giris_yapildi': True, 
            'kullanici_adi': current_user.kullanici_adi,
            'is_admin': current_user.is_admin
        })
    return jsonify({'giris_yapildi': False, 'is_admin': False})


# =========================================================================
# SUNUCU BAŞLANGIÇ KISMI
# =========================================================================
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        
        if Kullanici.query.filter_by(kullanici_adi='admin').first() is None:
            admin = Kullanici(kullanici_adi='admin', is_admin=True)
            admin.set_parola('gizliparola123') 
            db.session.add(admin)
            db.session.commit()
            print("Admin kullanıcısı otomatik olarak oluşturuldu.")

    app.run(debug=True)