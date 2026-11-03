# VazirmatnUG.woff2

Google Fonts'taki **Vazirmatn** (SIL OFL 1.1) fontunun değiştirilmiş kopyası.
Tek fark: `cmap` tablosunda U+0649 (ى, Uygurca yeh) harfi, U+06CC (ی) glifine bağlandı.
Orijinal font U+0649'u kelime başı/ortasında çizmiyordu ("كېلىڭىز" → "كېلڭز").

Yeniden üretmek için: `npm i vazirmatn`, fontTools ile variable TTF'te
`cmap[0x0649] = cmap[0x06CC]` yapıp woff2 olarak kaydet. Lisans: `OFL.txt` (vazirmatn paketi).
