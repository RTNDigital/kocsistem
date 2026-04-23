# Flowboard

Linear/Trello tarzı kanban proje yönetim uygulaması — Next.js 15, TypeScript, Supabase ve dnd-kit ile.

Tasarım dosyaları: `../src/` (statik HTML/JSX prototip).
Production stack: bu klasör.

---

## Hızlı bakış

| | |
|---|---|
| Framework | **Next.js 15** (App Router, React 19) |
| Dil | **TypeScript** |
| Auth + DB | **Supabase** (Auth + Postgres + RLS) |
| Server state | **TanStack Query** (optimistic updates) |
| Drag-drop | **@dnd-kit** (Pointer + Touch + Keyboard sensors) |
| Sıralama | **Fractional indexing** (`fractional-indexing`, LexoRank-benzeri) |
| Stil | Vanilla CSS variables (Tailwind yok — tema sistemi tasarımdan birebir taşındı) |
| Deploy | **Vercel** |

---

## Kurulum (yerel)

### 1. Supabase projesi
1. https://supabase.com'da yeni bir proje oluştur.
2. Project settings → API'den şu üçünü al:
   - `Project URL`
   - `anon` (public) key
   - `service_role` key
3. SQL Editor → "New query" → `supabase/schema.sql` içeriğini yapıştır → Run.
4. Aynı yerde bir kez de `supabase/seed.sql` içindeki `seed_demo_workspace` fonksiyonunu çalıştır (uygulama ilk login'de bunu çağırıyor).

### 2. Bağımlılıklar
```bash
cd flowboard
npm install
```

### 3. Environment
```bash
cp .env.example .env.local
# .env.local'i doldur:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Çalıştır
```bash
npm run dev
# http://localhost:3000
```

---

## Deploy (Vercel)

1. Repoyu GitHub'a push'la.
2. https://vercel.com → New Project → bu repo'yu import et.
3. **Root directory**: `flowboard` (proje bu klasörün altında).
4. Environment variables (3 tane):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy → URL hazır.

> Supabase Auth → URL Configuration kısmında Vercel domain'ini de "Site URL" ve "Redirect URLs"e eklemeyi unutma.

---

## Mimari kararlar

### Drag & drop — neden `@dnd-kit`?

| Aday | Neden seçilmedi |
|---|---|
| `react-beautiful-dnd` | Atlassian arşivledi (2023), bakımı yok. |
| `react-dnd` | API daha low-level, mobil için ekstra iş. |
| HTML5 native drag | iOS Safari'de stabil değil, touch desteği yok. |
| `SortableJS` | React entegrasyonu wrapper üzerinden, TS desteği zayıf. |
| **`@dnd-kit`** ✅ | Aktif, küçük (~10kb), built-in sensor sistemi (Pointer/Touch/Keyboard), ARIA, virtualization-friendly. |

### Sıralama — neden fractional indexing?

`columns.position` ve `cards.position` kolonları **integer** değil, **text** (LexoRank-benzeri):

```
"a0", "a1", "a2"  →  araya eklemek için "a0V" gibi key üretilir
```

Bunun avantajı:
- Bir kart hareketi = **1 satır UPDATE** (tüm sıralamayı renumber etmeye gerek yok).
- Sayfa yenilemede sıra DB'den geldiği için kaybolmaz.
- Postgres `text` index'i lexicographic sıralamayı native destekler.

Ayrıntılar: [`lib/ordering.ts`](./lib/ordering.ts).

### Optimistic updates

`hooks/useBoard.ts` içindeki `useMoveCard`, `onMutate` callback'inde React Query cache'ini anında günceller — DB cevabı dönene kadar UI bekler değil. Hata durumunda `onError` cache'i geri sarar.

### Mobil DnD

`TouchSensor` 250ms long-press ile aktive olur — bu sayede dikey scroll ile sürükleme karışmaz. Kartlar `touch-action: manipulation` taşıyor; sütunlar `touch-action: none` (drag handle).

### RLS (Row Level Security)

Tüm tablolarda RLS açık. `board_members` join tablosu üzerinden `has_board_access(board_id)` ve `is_board_editor(board_id)` SQL fonksiyonları erişimi denetliyor. Owner = otomatik member (trigger ile).

### Aktivite log'u

`activities` tablosu kart oluşturma/taşıma/yorum/board oluşturma olaylarını kaydediyor. Dashboard'daki feed buradan beslenir. Realtime subscribe **yok** (scope dışı); sayfa yenilenmesi gerekir veya React Query 30 saniyede bir staleTime ile yeniler.

### Kullanıcı arayüzü

Stiller mevcut prototipten birebir taşındı: CSS variables üzerinden 3 tema (default/cool/dark) ve 2 yoğunluk (comfortable/compact). Tailwind kullanılmadı çünkü mevcut tasarım sistemi zaten tutarlıydı.

---

## Klasör yapısı

```
flowboard/
├── app/
│   ├── login/              ← signin + signup (server actions)
│   ├── signup/
│   ├── board/[id]/
│   │   ├── page.tsx
│   │   ├── BoardScreen.tsx ← header + filters
│   │   ├── KanbanBoard.tsx ← dnd-kit context (en kritik dosya)
│   │   ├── CardTile.tsx
│   │   └── CardModal.tsx
│   ├── Dashboard.tsx
│   ├── page.tsx            ← redirect / seed
│   ├── layout.tsx
│   └── globals.css
├── components/             ← UI primitives + AppShell + QueryProvider + Icons
├── hooks/                  ← React Query hooks
├── lib/
│   ├── supabase/           ← browser/server/middleware clients
│   ├── ordering.ts         ← fractional indexing
│   ├── queries.ts          ← read functions
│   ├── mutations.ts        ← write functions
│   └── utils.ts
├── types/
│   ├── database.ts         ← Supabase tablo tipleri
│   └── domain.ts           ← uygulama tipleri
├── supabase/
│   ├── schema.sql          ← tablolar + RLS + trigger'lar
│   └── seed.sql            ← seed_demo_workspace RPC
└── middleware.ts           ← auth session refresh
```

---

## Bilinen sınırlamalar / "v1.5" listesi

- Realtime yok — başka kullanıcının değişikliği görünmek için sayfa yenilemek gerekir (Supabase Realtime + RLS karmaşası 48h scope dışı).
- Board paylaşma UI'ı yok (DB hazır, sadece davet ekranı eksik).
- View / filter preset kaydı yok (prototipteki `views` tablosu eklenmedi).
- Komut paleti (⌘K) ve global "tweaks" paneli prototipte var, henüz port edilmedi.
- Şifre sıfırlama eksik — "Forgot password" butonu placeholder.

---

## Test planı (manuel)

| Senaryo | Beklenen |
|---|---|
| Sign up → demo seed çalışır | "Flowboard — Product" + "Personal" boardları otomatik gelir |
| Card sürükle → bırak (aynı kolon) | Yeni sıra anında UI'da, DB'de `position` değişir; F5 sonrası korunur |
| Card sürükle → farklı kolon | UI anında güncellenir, activity feed'e "moved" satırı düşer |
| Boş kolona kart sürükle | Boş kolon highlight olur, drop hedefi alır |
| Kolon başlığını sürükle → reorder | Kolonlar yatay sıralanır, F5 sonrası korunur |
| Kart başlığına tıkla | Modal açılır (drag ile karışmaz; 8px threshold) |
| Mobilde kart üstüne 250ms bas | Sürükleme aktive olur; daha kısa basışlarda scroll çalışır |
| Aynı kart için aynı anda iki sekme açıp düzenle | Son yazılan kazanır (last-write-wins, intentional) |

Tarayıcı testi: Chrome/Safari/Firefox son sürümler + iOS Safari + Android Chrome.
