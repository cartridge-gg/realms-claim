# Merkle Drop Claim System - Setup Guide

This guide walks you through setting up and running the Merkle Drop claim system.

## Architecture Overview

```
Snapshot → Merkle Tree → Proofs + Signatures → Contract Verification → Claim
```

1. **Snapshot**: List of eligible addresses with claim data
2. **Merkle Tree**: Built from snapshot, root stored in contract
3. **Proofs**: Generated for each address to prove eligibility
4. **Signatures**: App signs each leaf hash to authorize claim
5. **Contract**: Verifies proof + signature, prevents double claims

## Setup Steps

### 1. Generate App Key Pair

```bash
cd client
bun run scripts/generateKey.ts
```

Copy the output private key to your `.env` file:
```bash
APP_PRIVATE_KEY=0x1234...
```

**⚠️ IMPORTANT**: Never commit this key to version control!

### 2. Prepare Snapshot

Edit `assets/snapshot.json` with your eligible addresses:

```json
[
  {
    "address": "0x05f3c0645a554b1b867c4d5e7c14ac4537de8d2d8e98b7d3e8b0c3e7a0f4b8e9",
    "index": 0,
    "claim_data": ["100", "200"]
  },
  {
    "address": "0x02c4d3c5e6f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
    "index": 1,
    "claim_data": ["150", "250"]
  }
]
```

**Fields:**
- `address`: Starknet address (66 chars, starts with 0x)
- `index`: Unique index (0, 1, 2, ...)
- `claim_data`: Array of felt252 values (amounts, token IDs, etc.)

### 3. Generate Campaign Data

```bash
bun run scripts/setupCampaign.ts
```

This will:
- Build a Merkle tree from the snapshot
- Generate proofs for each address
- Sign each leaf hash
- Output `assets/claimData.json`

**Output includes:**
- `merkleRoot`: To initialize the contract
- `publicKey`: To set in the contract
- `claims`: Proofs + signatures for each address

### 4. Deploy and Initialize Contract

```bash
# Build and deploy your Cairo contract
scarb build
starkli deploy ...

# Set the public key (from setupCampaign.ts output)
starkli invoke <CONTRACT_ADDRESS> set_app_public_key <PUBLIC_KEY>

# Initialize the drop (from setupCampaign.ts output)
starkli invoke <CONTRACT_ADDRESS> initialize_drop <CAMPAIGN_ID> <MERKLE_ROOT>
```

### 5. Update Client Environment

Add to `client/.env`:
```bash
VITE_CONTRACT_ADDRESS=0x...  # Your deployed contract
APP_PRIVATE_KEY=0x...        # From step 1
VITE_CAMPAIGN_ID=CAMPAIGN_1
```

### 6. Run Frontend

```bash
cd client
bun install
bun run dev
```

Visit http://localhost:5173 and connect your wallet to claim.

## File Structure

```
client/
├── scripts/
│   ├── generateKey.ts        # Generate app key pair
│   └── setupCampaign.ts      # Build merkle tree & proofs
├── src/
│   ├── components/
│   │   └── ClaimButton.tsx   # Claim UI component
│   └── utils/
│       └── merkle/
│           ├── leafHasher.ts        # Hash leaf data
│           ├── merkleTree.ts        # Build merkle tree
│           ├── proofGenerator.ts    # Generate proofs
│           └── signatureGenerator.ts # Sign claims
└── assets/
    ├── snapshot.json         # Input: eligible addresses
    └── claimData.json        # Output: proofs + signatures
```

## Usage Flow

### Admin (One-time setup):
1. Generate key pair
2. Create snapshot
3. Run `setupCampaign.ts`
4. Deploy contract
5. Set public key in contract
6. Initialize drop with merkle root

### User (Claim):
1. Connect wallet
2. Check eligibility (address in snapshot)
3. Click "Claim"
4. Sign transaction
5. Contract verifies proof + signature
6. Receive rewards

## Security Notes

- **Private Key**: Keep `APP_PRIVATE_KEY` secret! Only use in scripts, never in frontend
- **Public Key**: Safe to share, stored in contract
- **Merkle Root**: Public, proves snapshot integrity
- **Proofs**: Public, can be shared with users
- **Signatures**: Public, proves app authorized the claim

## Verification

The contract verifies:
1. ✓ Merkle proof is valid (address in snapshot)
2. ✓ Signature is valid (app authorized)
3. ✓ Not already claimed (no double claims)
4. ✓ Caller matches leaf address (right user)

## Troubleshooting

**"Invalid merkle proof"**
- Ensure merkle root in contract matches `claimData.json`
- Verify snapshot hasn't changed since `setupCampaign.ts` ran

**"Invalid signature"**
- Ensure public key in contract matches private key used to sign
- Re-run `setupCampaign.ts` after changing keys

**"Already claimed"**
- This address already claimed successfully
- Each address can only claim once

**"Caller address mismatch"**
- Connected wallet doesn't match claim address
- Use the correct wallet

## Example Contract Calls

### Set Public Key
```typescript
await contract.set_app_public_key(publicKey);
```

### Initialize Drop
```typescript
await contract.initialize_drop(campaignId, merkleRoot);
```

### Claim
```typescript
const leafData = {
  address: userAddress,
  index: 0,
  claim_data: ["100", "200"]
};

await contract.claim(
  campaignId,
  leafData,
  proof,      // Array of sibling hashes
  signature.r,
  signature.s
);
```

### Check if Claimed
```typescript
const claimed = await contract.is_claimed(leafHash);
```

### Get Merkle Root
```typescript
const root = await contract.get_merkle_root(campaignId);
```

## Development Tips

1. **Test Locally**: Use devnet for testing before mainnet
2. **Small Snapshot First**: Test with 2-3 addresses initially
3. **Verify Proofs**: Run verification locally before deploying
4. **Monitor Events**: Watch for `Claimed` events on contract
5. **Backup Data**: Keep `claimData.json` safe for users

## Support

For issues or questions, check:
- Contract code: `src/systems/actions.cairo`
- Tests: `src/tests/test_world.cairo`
- Utilities: `client/src/utils/merkle/`
