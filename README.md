# NeuroLoop — Zihin Antrenmanı

Günlük 5–15 dakikalık bilişsel antrenman uygulaması. Şu an **yalnızca yerelde çalışır**: backend yoktur, tüm veri tarayıcının `localStorage`'ında (`neuroloop:v1`) tutulur.

## Çalıştırma

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

Diğer komutlar (`client/` içinde): `npm test`, `npm run typecheck`, `npm run build`.

## Neler var

- **8 oyun:** Memory Grid, Symbol Match, Distractor Field, Rule Switch, Pattern Sequence, Quick Calc, Dual Task, Recall Chain
- **Oyun motoru:** IDLE → READY → COUNTDOWN → PLAYING → RESULT → SUMMARY yaşam döngüsü, duraklatılabilir zamanlayıcı, ortak `GameResult`
- **Skor motoru:** doğruluk %50 / hız %30 / tutarlılık %20, zorluk çarpanı, kişisel rekor
- **Adaptif zorluk (1–100):** oyun başına, `>%90 → +5`, `%70–90 → +1`, `<%60 → −5`, 3 başarısız oturumda `−10`
- **Günlük antrenman:** zayıf alanlara ve uzun süredir oynanmayanlara öncelikli, kategori dengeli, tarih tohumlu (gün içinde sabit)
- **Panel, İlerleme (7/30/90/tümü), Profil, Ayarlar**, XP / seviye / seri / 15 başarım
- Açık / koyu tema, hareketi azalt, renk yardımcısı, klavye + dokunmatik girdi

## Yapı

```
client/src/engine      GameEngine, skor, adaptif zorluk, günlük plan, beceriler, XP/başarımlar
client/src/games       her oyun kendi klasöründe (GameModule) + registry.ts
client/src/pages       Dashboard, Games, GamePlay, DailyTraining, Progress, Profile, Settings
client/src/store       Zustand + localStorage kalıcılığı
shared/                frontend/backend ortak tipler ve sabitler
```

Yeni oyun eklemek: `shared/constants` içine meta → `games/<oyun>/` altında `GameModule` → `games/registry.ts`'e ekle. Mevcut oyunlara dokunmak gerekmez.

> Skorlar eğlence amaçlı bir antrenman göstergesidir; IQ, tıbbi ölçüm veya klinik değerlendirme değildir.
