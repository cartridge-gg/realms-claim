# Vercel Serverless API Functions

This directory contains Vercel serverless functions for the claims management system.

## Available Endpoints

### POST /api/check-eligibility
Check if a wallet address is eligible for claims.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "isEligible": true,
  "claimAmount": 573,
  "message": "Congratulations! You are eligible to claim 573 tokens."
}
```

### POST /api/claim
Process a claim for a wallet address.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "claimedAmount": 100,
  "transactionId": "0xabc123...",
  "timestamp": "2025-10-03T17:35:00.000Z",
  "message": "Successfully claimed 100 tokens for wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

## Testing Locally

Install dependencies:
```bash
bun install
```

Use Vercel CLI for local testing:
```bash
vercel dev
```

## Deployment

Deploy to Vercel:
```bash
vercel deploy
```
