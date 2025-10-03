# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack application for managing claims with eligibility checking. The project uses a monorepo structure with separate client and server directories.

**Architecture:**
- **Client**: React 19 + TypeScript + Vite frontend
- **Server**: Express.js backend with TypeScript, running on port 3000
- **API**: Vercel serverless functions in `/api` directory
- **Package Manager**: Bun (both client and server use Bun)

## Development Commands

### Server (Express API)
```bash
cd server
bun install          # Install dependencies
bun start            # Start server with nodemon (hot reload on port 3000)
```

### Client (React + Vite)
```bash
cd client
bun install          # Install dependencies
bun dev              # Start dev server with HMR
bun build            # Build for production (runs TypeScript compiler + Vite build)
bun lint             # Run ESLint
bun preview          # Preview production build
```

### Vercel Deployment
```bash
# Install Vercel CLI globally
bun add -g vercel

# Deploy to Vercel (builds client and deploys API functions)
vercel deploy

# Deploy to production
vercel --prod
```

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── App.tsx          # Main application component
│   │   ├── main.tsx         # Application entry point
│   │   └── assets/          # Static assets
│   └── public/              # Public static files
│
├── server/          # Express backend
│   └── index.ts             # Server entry point with API routes
│
├── api/             # Vercel serverless functions
│   ├── check-eligibility.ts # Check wallet eligibility
│   └── claim.ts             # Process claim for wallet
```

## API Endpoints

### Express Server Routes (`server/index.ts`)
- `POST /check_eligibility` - Check claim eligibility
- `POST /claim` - Process a claim

### Vercel Serverless Functions (`/api`)
Both functions accept wallet addresses and return arbitrary values for testing:

- `POST /api/check-eligibility` - Check wallet eligibility
  - Request: `{ walletAddress: string }`
  - Response: `{ walletAddress, isEligible, claimAmount, message }`
  - Validates Ethereum address format (0x + 40 hex chars)

- `POST /api/claim` - Process claim for wallet
  - Request: `{ walletAddress: string, amount?: number }`
  - Response: `{ success, walletAddress, claimedAmount, transactionId, timestamp, message }`
  - Generates mock transaction data

## Tech Stack Details

**Server:**
- Express 5.1.0
- TypeScript with ES modules
- dotenv for environment variables
- nodemon for development hot-reload

**Client:**
- React 19.1.1 with TypeScript
- Vite 7.1.7 for build tooling
- vite-plugin-vercel for Vercel integration
- ESLint with React hooks and React refresh plugins
- TypeScript 5.9.3

**Vercel Functions:**
- @vercel/node for serverless function runtime
- TypeScript with Vercel Request/Response types
- Configured in `vercel.json` for deployment
