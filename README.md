# Athenaeum Digital Library System

A modern, responsive, institutional digital library web application with database-backed search, physical accession tracking, patron loans, holds, librarian command console, and a full-featured distraction-free **Digital Reading Room**.

---

## 🚀 Deploy to Vercel via Git

This repository is pre-configured for **one-click and Git-based deployment to Vercel**:

### Option 1: Git Push (GitHub / GitLab / Bitbucket)

1. **Initialize and Push to your Remote Git Repository**:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit of Athenaeum Digital Library"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   * Navigate to [vercel.com/new](https://vercel.com/new).
   * Import your Git repository.
   * Vercel will automatically detect the configuration in `vercel.json` and `package.json` (Framework Preset: **Vite**, Node.js Version: **22.x**).
   * Click **Deploy**!

### Option 2: Deploy with Vercel CLI

```bash
# Login and deploy in one command
npx vercel
```

---

## 🛠 Project Architecture

* **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4.
* **Serverless API**: Express-based REST API running on Vercel Serverless Functions (`/api/index.ts` with rewrites configured in `vercel.json`).
* **Database**: Embedded SQLite database (`node:sqlite` in Node 22) pre-seeded with 367+ catalog volumes, 605 physical accession copies, 337 authors, 11 disciplines, and curated chapter texts.
* **Serverless Storage**: Designed with automatic `/tmp` filesystem replication on Vercel, ensuring zero read-only filesystem errors (`EROFS`) during serverless invocations.

---

## 📖 Key Features

* **Digital Reading Room**: Distraction-free reader with 5 paper tones (Cream, Sepia, Ivory, Sage, Midnight), font family and scale selection, audio narration (Text-to-Speech), passage highlighting, marginal notes, and automatic chapter progress tracking.
* **Database-Powered Search & Multi-Faceted Filters**: Real-time debounced query across titles, authors, ISBNs, publishers, and categories.
* **Physical Shelf Availability**: Tracks individual copy accession numbers, barcodes, sections, and floor levels.
* **Circulation & Holds**: Borrowing, renewals, reservations, favorites, and notifications.
* **Librarian Command Console**: Instant database synchronization, loan check-in/out by barcode, role management, and batch catalog ingestion (JSON/CSV).

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
