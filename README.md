<div align="center">
  
  # 🚀 SyncBoard
  **The Ultimate Real-Time Collaborative Infinite Canvas**

  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?style=for-the-badge&logo=prisma)](https://prisma.io/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![PeerJS](https://img.shields.io/badge/PeerJS-WebRTC-FF4F00?style=for-the-badge)](https://peerjs.com/)

  <p align="center">
    An elegant, high-performance, and feature-rich collaborative whiteboard built for modern teams.
  </p>
</div>

---

## ✨ Features

- 🎨 **Infinite Canvas Engine**: High-performance rendering with pan, zoom, and limitless space.
- ⚡ **Real-Time Collaboration**: Instant synchronization across all connected clients via Socket.io.
- 🎥 **Built-in Screen Sharing**: Peer-to-peer ultra-low latency screen sharing using WebRTC & PeerJS.
- 🍿 **Synced Media Playback**: Watch YouTube videos or TMDB movies completely synchronized with your friends.
- 📝 **Rich Toolkit**: Pen, arrows, shapes, sticky notes, and text elements.
- 🔐 **Authentication**: Seamless Google OAuth integration via NextAuth.
- ☁️ **Cloud Storage**: Persistent rooms saved securely to PostgreSQL via Prisma.
- 🧩 **Browser Extension**: Includes a Chrome extension to inject collaborative overlays across the web.

## 🏗️ Architecture

SyncBoard is built as a **Turborepo** monorepo, perfectly structured for scalability and deployment:

```mermaid
graph TD;
    A[Web App - Next.js] --> C(Shared Package);
    B[Realtime Server - Socket.io] --> C;
    C --> D[(PostgreSQL)];
    A <-->|WebSockets| B;
    A <-->|WebRTC| E[Peer Clients];
```

### Monorepo Structure

* `apps/web`: The main Next.js 14 frontend application (React, Tailwind, Zustand).
* `apps/realtime`: The Node.js + Socket.io backend server for sub-millisecond event broadcasting.
* `apps/extension`: The vanilla JavaScript Chrome Extension.
* `packages/shared`: Shared database schema, Prisma client, and common utilities.

## 🛠️ Tech Stack

**Frontend (apps/web)**
* **Framework**: Next.js 14 (App Router)
* **Styling**: Tailwind CSS + Framer Motion for sleek micro-animations
* **State Management**: Zustand (with selective re-rendering)
* **Icons**: Lucide React
* **WebRTC**: PeerJS with Metered OpenRelay TURN servers

**Backend (apps/realtime)**
* **Runtime**: Node.js
* **Sockets**: Socket.io (with CORS configured for production)

**Database (packages/shared)**
* **ORM**: Prisma
* **Database**: PostgreSQL
* **Auth**: NextAuth.js

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (Local or Cloud like Supabase/Neon)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YourUsername/SyncBoard.git
   cd SyncBoard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in `apps/web` and `apps/realtime`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/syncboard"
   AUTH_SECRET="generate-a-random-secret"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   TMDB_API_KEY="your-tmdb-api-key"
   NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
   ```

4. **Initialize Database**
   ```bash
   npm run db:push --workspace=@syncboard/shared
   ```

5. **Run the Development Servers**
   ```bash
   npm run dev
   ```
   This will simultaneously start the Next.js frontend on port `3000` and the Realtime Server on port `3001`.

## 🌐 Deployment Guide

This project is strictly configured for a decoupled production deployment:

1. **Frontend**: Deploy `apps/web` to [Vercel](https://vercel.com). Make sure to set the `NEXT_PUBLIC_SOCKET_URL` environment variable to point to your deployed realtime server.
2. **Backend**: Deploy `apps/realtime` to a persistent environment like [Railway](https://railway.app) or [Render](https://render.com). (Vercel Serverless functions do not support persistent WebSockets).
3. **Database**: Host your PostgreSQL instance on Supabase, Neon, or Railway and provide the connection strings to both deployed apps.

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.

---
<div align="center">
  <i>Designed with UI/UX Pro Max philosophy. Built for the future of collaboration.</i>
</div>
