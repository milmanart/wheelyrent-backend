# WheelyRent — Backend

Backend for the WheelyRent car rental application. Built with Node.js, Express, PostgreSQL and Prisma. Authentication via JWT.

## Getting started

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed
npm start
```

## Environment

```
DATABASE_URL=postgresql://user:password@localhost:5432/rentcar
JWT_SECRET=your_secret
PORT=3000
```
