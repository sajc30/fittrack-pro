# FitTrack Pro

A serious gym tracking app. Web dashboard + iOS companion. Built as a Turborepo monorepo.

## Stack

| Layer           | Technology                              |
|-----------------|-----------------------------------------|
| Monorepo        | Turborepo + pnpm workspaces             |
| Web             | Next.js 15, shadcn/ui, Tailwind v4      |
| Mobile          | Expo SDK 54, Expo Router, NativeWind    |
| Charts (web)    | Recharts v3                             |
| Charts (mobile) | react-native-gifted-charts              |
| Database        | Supabase (Postgres + Auth + RLS)        |
| Shared logic    | `packages/shared` — types, calculations |
| Deploy (web)    | Vercel                                  |
| Deploy (iOS)    | EAS Build + EAS Submit → App Store      |

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open the SQL editor and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Configure environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Fill in your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Run the web app

```bash
pnpm dev:web
# Opens at http://localhost:3000
```

### 5. Run the mobile app

```bash
pnpm dev:mobile
# Requires Expo Go on your phone, or a simulator
# For HealthKit features, requires a physical iOS device and custom dev client
```

## Project Structure

```
fittrack-pro/
├── apps/
│   ├── web/          # Next.js 15 web dashboard
│   └── mobile/       # Expo SDK 54 iOS app
├── packages/
│   ├── shared/       # Types, calculations (BMR/TDEE, 1RM), utilities
│   └── config/       # Shared ESLint, TS, Tailwind configs
├── supabase/
│   └── migrations/   # SQL schema — run in Supabase SQL editor
└── turbo.json
```

## Design System

Dark-first. Warm near-black backgrounds (`#080809`). Amber gold accent (`#F59E0B`).
Barlow Condensed for stats and numbers. Inter for UI text.

## App Store Deployment

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build for iOS
cd apps/mobile
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

Requires Apple Developer Program membership ($99/year).
