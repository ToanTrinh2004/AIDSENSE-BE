# 🚨 AIDSENSE — Backend Service

> **An intelligent emergency rescue platform** that connects people in danger with nearby rescuers in real time. Built with NestJS, Supabase (PostgreSQL), and a Python-powered NLP module for SOS detection.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Modules](#api-modules)
- [Docker Deployment](#docker-deployment)
- [License](#license)

---

## Overview

**AIDSENSE** is a mobile rescue application that helps users send SOS signals in emergency situations. The backend service handles real-time SOS broadcasting, user authentication, media uploads, email notifications, and integrates a Python NLP module to intelligently classify SOS messages.

The mobile frontend is built with **Flutter** and communicates with this backend via REST APIs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [NestJS](https://nestjs.com/) v11 (TypeScript) |
| Database | PostgreSQL via [Supabase](https://supabase.com/) |
| ORM | TypeORM |
| Auth | JWT (`@nestjs/jwt`) + bcrypt |
| Cache / Queue | Redis (`ioredis`) |
| Media Storage | Cloudinary |
| Email | Nodemailer |
| NLP Module | Python (`sos_nlp`) |
| Containerization | Docker (multi-stage build) |
| Runtime | Node.js 18 Alpine |

---

## Architecture

```
Flutter (Mobile App)
        │
        ▼
  NestJS REST API  ──────────► Supabase (PostgreSQL)
        │
        ├──────────────────► Redis (caching / queue)
        │
        ├──────────────────► Cloudinary (media uploads)
        │
        ├──────────────────► Nodemailer (email alerts)
        │
        └──────────────────► Python NLP Service (sos_nlp)
                              └── SOS message classification
```

---

## Features

- 🔐 **Authentication** — JWT-based login/register with bcrypt password hashing
- 🆘 **SOS Broadcasting** — Users can send emergency signals with location data
- 🧠 **NLP SOS Detection** — Python module (`sos_nlp`) analyzes messages to detect distress signals
- 📍 **Rescue Coordination** — Matches SOS senders with nearby rescuers
- 🖼️ **Media Upload** — Images/files uploaded to Cloudinary via stream
- 📧 **Email Notifications** — Automated alerts sent via Nodemailer
- ⚡ **Redis Caching** — Fast data retrieval and job queuing with ioredis
- 🐳 **Docker Ready** — Multi-stage Dockerfile for lean production images
- ✅ **Validation** — Request validation with `class-validator` and `class-transformer`

---

## Project Structure

```
AIDSENSE-BE/
├── src/                    # NestJS application source
│   ├── app.module.ts       # Root module
│   ├── main.ts             # Entry point (port 3000)
│   └── [feature modules]  # Auth, SOS, Users, Rescue, etc.
├── sos_nlp/               # Python NLP service for SOS classification
├── test/                  # E2E and unit tests
├── dockerfile             # Multi-stage Docker build
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- PostgreSQL (or a Supabase project)
- Redis instance
- Python 3 (for `sos_nlp` module)

### Installation

```bash
# Clone the repository
git clone https://github.com/ToanTrinh2004/AIDSENSE-BE.git
cd AIDSENSE-BE

# Install dependencies
npm install
```

### Running the App

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# App
PORT=3000
NODE_ENV=development

# Database (Supabase / PostgreSQL)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
DATABASE_URL=your_postgres_connection_string

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
```

---

## API Modules

| Module | Description |
|---|---|
| `Auth` | Register, login, JWT token management |
| `Users` | User profile management |
| `SOS` | SOS signal creation, broadcasting, and status |
| `Rescue` | Rescuer matching and coordination |
| `Media` | File/image uploads via Cloudinary |
| `Notification` | Email alerts via Nodemailer |

> Full API documentation coming soon (Swagger).

---

## Docker Deployment

The project uses a **multi-stage Docker build** to keep the production image minimal.

```bash
# Build the Docker image
docker build -t aidsense-be .

# Run the container
docker run -p 3000:3000 --env-file .env aidsense-be
```

### Dockerfile Overview

```
Stage 1 (builder): node:18-alpine
  → Install all dependencies
  → Compile TypeScript → dist/

Stage 2 (production): node:18-alpine
  → Install production deps only
  → Copy dist/ from builder
  → Expose port 3000
  → CMD: node dist/main.js
```

---

## Python NLP Module (`sos_nlp`)

The `sos_nlp` directory contains a Python-based NLP service responsible for detecting and classifying SOS distress signals from user messages. It is invoked by the NestJS backend when processing incoming SOS requests to add an AI-powered layer of intent detection.

---

## License

This project is private and unlicensed. All rights reserved © 2024 ToanTrinh2004.

---

<p align="center">
  Built with ❤️ using NestJS · Supabase · Flutter · Python
</p>
