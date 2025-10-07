# Quick Reference - Realms Claim System

**Current Codebase Version:** After master merge (d983c7d)

---

## 🚀 Quick Start Commands

### Initial Setup
```bash
# 1. Get Reown Project ID
# Visit: https://cloud.reown.com
# Create project → Copy Project ID

# 2. Generate app keypair
cd client
bun run generate-key
# Save: APP_PRIVATE_KEY to .env, Public Key for contract

# 3. Transform snapshot
bun run transform-snapshot
# Creates: assets/snapshot-transformed.json

# 4. Deploy contract
cd ..
sozo build && sozo migrate apply
# Save: Contract address

# 5. Initialize contract
sozo execute actions set_app_public_key --calldata PUBLIC_KEY
sozo execute actions initialize_drop --calldata CAMPAIGN_ID MERKLE_ROOT

# 6. Generate campaign data
cd client
bun run setup-campaign
# Creates: assets/claimData.json

# 7. Start frontend
bun run dev
```

---

## 📦 Current System State

### Snapshot Data
- **Source:** Pirate Nation (Ethereum)
- **Addresses:** 2,146 Ethereum addresses
- **Location:** `client/src/data/snapshot.json`
- **Format:** `[["0xethAddress", ["0x3c", "0x231"]], ...]`

### Wallet Connections
- **Ethereum:** Reown AppKit (formerly WalletConnect)
- **Starknet:** Cartridge Controller
- **UI:** Two buttons side-by-side

### Technology Stack
- **Contracts:** Cairo (Dojo)
- **Frontend:** React + TypeScript
- **Eth Wallet:** `@reown/appkit` + `wagmi`
- **Starknet Wallet:** `@starknet-react/core`

---

## 🔑 Environment Variables

### Required in `client/.env`
```bash
# Reown AppKit
VITE_REOWN_PROJECT_ID=your_project_id

# Contract
VITE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
VITE_CAMPAIGN_ID=PIRATE_NATION_CLAIM

# Private Key (DO NOT COMMIT)
APP_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# RPC
VITE_STARKNET_RPC_URL=https://api.cartridge.gg/x/starknet/sepolia
```

---

## 📝 Available Scripts

### Client Scripts
```bash
cd client

# Generate keypair for signing claims
bun run generate-key

# Transform Ethereum snapshot to Starknet format
bun run transform-snapshot

# Generate Merkle tree and claim data
bun run setup-campaign

# Run comprehensive tests
bun run test:claim-flow

# Start development server
bun run dev
```

### Contract Scripts
```bash
# Build contract
sozo build

# Deploy contract
sozo migrate apply

# Deploy to Sepolia
sozo migrate apply --rpc-url https://api.cartridge.gg/x/starknet/sepolia

# Call contract functions
sozo call actions FUNCTION_NAME --calldata ARGS

# Execute contract transactions
sozo execute actions FUNCTION_NAME --calldata ARGS

# Inspect contract
sozo inspect actions
```

---

## 🎯 Key Contract Functions

### Admin Functions (Need Access Control!)
```bash
# Set app public key
sozo execute actions set_app_public_key \
  --calldata PUBLIC_KEY

# Initialize campaign
sozo execute actions initialize_drop \
  --calldata CAMPAIGN_ID MERKLE_ROOT
```

### View Functions
```bash
# Get merkle root for campaign
sozo call actions get_merkle_root \
  --calldata CAMPAIGN_ID

# Check if claimed
sozo call actions is_claimed \
  --calldata LEAF_HASH
```

### User Functions
```bash
# Claim (called from frontend)
sozo execute actions claim \
  --calldata CAMPAIGN_ID LEAF_DATA PROOF SIG_R SIG_S
```

---

## 🔍 Debugging Commands

### Check Contract State
```bash
# View deployed contracts
sozo inspect actions

# Get contract address
sozo inspect actions | grep contract_address

# Check public key is set (shouldn't be 0)
sozo call actions get_merkle_root --calldata CAMPAIGN_1

# Check claim status
sozo call actions is_claimed --calldata LEAF_HASH
```

### Check Files Exist
```bash
# Original snapshot (Ethereum addresses)
cat client/src/data/snapshot.json | jq '.snapshot | length'

# Transformed snapshot (Starknet format)
cat client/assets/snapshot-transformed.json | jq 'length'

# Campaign data (with proofs)
cat client/assets/claimData.json | jq '.totalClaims'

# Contract ABI
cat client/src/abis/actions.json | jq '.length'
```

### Frontend Debugging
```bash
# Check env variables loaded
cd client && bun run dev
# Open console, check: import.meta.env

# Check wallet connections
# Open browser DevTools → Console
# Should see: AppKit loaded, Starknet provider loaded
```

---

## 🌳 File Structure

```
realms-claim/
├── src/
│   ├── systems/
│   │   └── actions.cairo          # Main claim contract
│   ├── models.cairo               # Data structures
│   └── tests/
│       └── test_world.cairo       # Contract tests
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── connect-stark.tsx  # Starknet wallet
│   │   │   └── connect-eth.tsx    # Ethereum wallet (AppKit)
│   │   ├── stores/
│   │   │   ├── provider.tsx       # Starknet provider
│   │   │   └── ethProvider.tsx    # Ethereum provider (AppKit)
│   │   ├── utils/merkle/          # Merkle tree utilities
│   │   ├── data/
│   │   │   └── snapshot.json      # Ethereum addresses (2,146)
│   │   └── App.tsx
│   ├── scripts/
│   │   ├── generateKey.ts         # Generate keypair
│   │   ├── transformSnapshot.ts   # Transform snapshot
│   │   ├── setupCampaign.ts       # Generate merkle tree
│   │   └── testClaimFlow.ts       # Test suite
│   ├── assets/
│   │   ├── snapshot-transformed.json  # After transform
│   │   └── claimData.json             # After setup-campaign
│   └── .env
├── SETUP_GUIDE.md                 # ← Start here!
├── SECURITY_AUDIT.md              # Security issues
└── Scarb.toml                     # Cairo project config
```

---

## 🐛 Common Issues

### "Missing Project ID"
```bash
# Add to client/.env:
VITE_REOWN_PROJECT_ID=your_id_from_reown_cloud

# Restart dev server
```

### "Campaign not initialized"
```bash
# Run initialize_drop
sozo execute actions initialize_drop \
  --calldata CAMPAIGN_ID MERKLE_ROOT
```

### "App public key not set"
```bash
# Run set_app_public_key
sozo execute actions set_app_public_key \
  --calldata YOUR_PUBLIC_KEY
```

### "Invalid signature"
```bash
# Regenerate campaign data
cd client
bun run setup-campaign
```

### Snapshot not found
```bash
# Check file exists
ls -lh client/src/data/snapshot.json

# Should show: 269K file with 2,146 addresses
```

---

## 📊 Cross-Chain Claim Flow

```
1. User connects Ethereum wallet → Check eligibility
   ↓
2. User connects Starknet wallet → Link addresses
   ↓
3. User signs message with Ethereum wallet → Prove ownership
   ↓
4. Frontend prepares claim data:
   • Ethereum address (from snapshot)
   • Starknet address (where to claim)
   • Merkle proof (from claimData.json)
   • App signature (from claimData.json)
   • Ownership proof (from step 3)
   ↓
5. Submit to Starknet contract → claim()
   ↓
6. Contract verifies:
   ✓ Ethereum ownership
   ✓ Merkle proof
   ✓ App signature
   ✓ Not already claimed
   ↓
7. Claim succeeds → Tokens distributed
```

---

## 🔒 Critical Security Notes

### Before Production:
1. **Add Access Control** to admin functions
2. **Prevent Campaign Overwrites**
3. **Add Emergency Pause**
4. **Get Professional Audit**

See `SECURITY_AUDIT.md` for full details.

---

## 📚 Related Documentation

- **`SETUP_GUIDE.md`** - Complete setup instructions (40+ pages)
- **`SECURITY_AUDIT.md`** - Security analysis and fixes
- **`WALLET_SETUP.md`** - Detailed wallet configuration
- **`CLAIM_CHECKLIST.md`** - Step-by-step checklist (may be outdated)

---

## ✅ Quick Health Check

Run these to verify system is ready:

```bash
# 1. Environment variables
cd client && cat .env | grep -E "VITE_REOWN|VITE_CONTRACT|APP_PRIVATE"

# 2. Snapshot exists
ls -lh client/src/data/snapshot.json

# 3. Contract deployed
sozo inspect actions

# 4. Public key set
sozo call actions get_merkle_root --calldata CAMPAIGN_1

# 5. Dependencies installed
cd client && bun install

# 6. Frontend starts
bun run dev
```

All green? You're ready to test claims! 🚀

---

**Questions?** See `SETUP_GUIDE.md` for detailed explanations.
