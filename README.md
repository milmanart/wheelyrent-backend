# WheelyRent — Backend

REST API aplikacji do wynajmu samochodów WheelyRent. Node.js, Express, PostgreSQL, Prisma, autoryzacja JWT.

## Wymagania

- Node.js 18+
- PostgreSQL 15+

## Uruchomienie

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed
npm start
```

## Środowisko

```
DATABASE_URL=postgresql://user:password@localhost:5432/rentcar
JWT_SECRET=your_secret
PORT=3000
```

## API

- `auth`     — rejestracja, logowanie, bieżący użytkownik, zmiana hasła
- `users`    — profil, dokumenty, karty płatnicze, powiadomienia
- `cars`     — lista/wyszukiwanie, szczegóły, dostępność, opinie; CRUD (admin)
- `bookings` — utworzenie, moje rezerwacje, anulowanie; wszystkie rezerwacje (admin)

Opinię można dodać dopiero po zakończonym wynajmie danego auta.
Zdjęcia serwowane są z `/img`.
