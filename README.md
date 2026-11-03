# myNotes

Shexsiy xatire / wezipe taxtisi (Next.js + shadcn/ui). Ma'lumatlar peqet brauzerning localStorage'ida saqlinidu.

```bash
npm run dev     # http://localhost:3000
npm run build
```

## Mexpiy söz
`lib/auth.ts` ichidiki `PASSWORD_HASH` — mexpiy sözning SHA-256 hash'i. Özgertish üchün:

```bash
printf 'YENGI_SOZ' | shasum -a 256
```

Netijini `PASSWORD_HASH` ornigha qoyung. Diqqet: tekshürüsh brauzerda bolghachqa, bu peqet interfeysni qulupleydu.

## Tekistler
Barliq interfeys tekistliri `lib/i18n.ts` ichide.

## Vercel
Repo'ni Vercel'ge ulang (muhit özgergüchisi kerek emes).
