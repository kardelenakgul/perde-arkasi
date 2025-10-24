# app.py dosyasıııı

from flask import Flask, render_template, request, jsonify # 'request' ve 'jsonify' eklendi
from flask_sqlalchemy import SQLAlchemy # Yeni eklendi

# Flask uygulamasını başlat
app = Flask(__name__)

# SQLite Veritabanı Ayarları:
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///yorumlar.db' 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# SQLAlchemy nesnesini başlat
db = SQLAlchemy(app)

# Yorumlar için veritabanı tablosu (Model)
class Yorum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    film_id = db.Column(db.String(50), nullable=False) # Hangi filme ait olduğunu tutar
    kullanici = db.Column(db.String(80), nullable=False)
    puan = db.Column(db.Integer, nullable=False) # 1'den 10'a kadar puan
    yorum_metni = db.Column(db.Text, nullable=False)
    tarih = db.Column(db.DateTime, default=db.func.now())

    def __repr__(self):
        return f'<Yorum {self.id} - {self.film_id}>'

# Ana sayfaya gelen isteği yönetecek fonksiyon
# Yorum gönderme (kaydetme) API endpoint'i
@app.route('/api/yorum-gonder', methods=['POST'])
def yorum_gonder():
    # Güvenlik kontrolü
    if not request.is_json:
        return jsonify({'hata': 'JSON verisi bekleniyor'}), 400
        
    data = request.get_json()

    # Eğer JSON verisi eksikse veya boşsa hata döndür
    if not data or 'film_id' not in data:
        return jsonify({'hata': 'Gerekli veriler eksik.'}), 400

    yeni_yorum = Yorum(
        film_id=data['film_id'],
        kullanici=data['kullanici'],
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


# Yorumları çekme API endpoint'i
@app.route('/api/yorum-cek/<film_id>', methods=['GET'])
def yorum_cek(film_id):
    yorumlar = Yorum.query.filter_by(film_id=film_id).order_by(Yorum.tarih.desc()).all()
    
    # Yorum nesnelerini JSON'a çevir
    yorum_listesi = []
    for yorum in yorumlar:
        yorum_listesi.append({
            'kullanici': yorum.kullanici,
            'puan': yorum.puan,
            'yorum_metni': yorum.yorum_metni,
            'tarih': yorum.tarih.strftime('%d/%m/%Y %H:%M')
        })
        
    return jsonify(yorum_listesi)

# =========================================================================
# TEMEL INDEX FONKSİYONU (Sizdeki mevcut kod)
# =========================================================================
@app.route("/")
def index():
    return render_template("index.html")

# =========================================================================
# SUNUCU BAŞLANGIÇ KISMI (Yorum satırı olmaktan ÇIKTI)
# =========================================================================
if __name__ == "__main__":
    app.run(debug=True)