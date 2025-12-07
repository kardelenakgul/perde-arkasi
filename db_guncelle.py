import sqlite3
import os

# Veritabanı dosyasının yerini bulmaya çalışalım
if os.path.exists('instance/yorumlar.db'):
    db_path = 'instance/yorumlar.db'
elif os.path.exists('yorumlar.db'):
    db_path = 'yorumlar.db'
else:
    print("❌ HATA: yorumlar.db dosyası bulunamadı!")
    exit()

print(f"Veritabanı bulundu: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("ALTER TABLE film ADD COLUMN oyuncular TEXT DEFAULT 'Oyuncu bilgisi girilmedi'")
    
    conn.commit()
    conn.close()
    print("✅ BAŞARILI: 'oyuncular' sütunu eklendi! Filmleriniz güvende.")
    
except sqlite3.OperationalError as e:
    print(f"ℹ️ Bilgi: {e} (Muhtemelen sütun zaten var, sorun yok.)")
except Exception as e:
    print(f"❌ Beklenmedik Hata: {e}")