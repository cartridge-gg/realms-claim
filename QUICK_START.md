# Merkle Drop Claim System - Quick Start

## 🚀 Complete Setup in 5 Steps

### Step 1: Generate App Keys
```bash
cd client
bun run generate-key
```
Copy the private key to `client/.env`:
```bash
APP_PRIVATE_KEY=0x...
```

### Step 2: Create Snapshot
Edit `assets/snapshot.json`:
```json
[
  {
    "address": "0x05f3c0645a554b1b867c4d5e7c14ac4537de8d2d8e98b7d3e8b0c3e7a0f4b8e9",
    "index": 0,
    "claim_data": ["100", "200"]
  }
]
```

### Step 3: Generate Campaign Data
```bash
bun run setup-campaign
```
This creates `assets/claimData.json` with:
- Merkle root
- Public key
- Proofs for each address
- Signatures

### Step 4: Deploy & Initialize Contract
```bash
# Build contract
scarb build

# Deploy (use your preferred method)
starkli deploy ...

# Set public key (from setup-campaign output)
starkli invoke <CONTRACT> set_app_public_key <PUBLIC_KEY>

# Initialize drop (from setup-campaign output)
starkli invoke <CONTRACT> initialize_drop CAMPAIGN_1 <MERKLE_ROOT>
```

### Step 5: Run Frontend
```bash
# Add contract address to .env
echo "VITE_CONTRACT_ADDRESS=0x..." >> .env

# Start dev server
bun run dev
```

Visit http://localhost:5173 to test claims!

---

## 📁 What Was Created

### Contract Side (`src/`)
```
models.cairo          - Data models (ClaimStatus, MerkleRoot, etc.)
systems/actions.cairo - Claim logic with merkle verification
tests/test_world.cairo - Test suite
```

**Key Functions:**
- `set_app_public_key(public_key)` - Set app's public key
- `initialize_drop(campaign_id, merkle_root)` - Create new campaign
- `claim(campaign_id, leaf_data, proof, sig_r, sig_s)` - Execute claim
- `is_claimed(leaf_hash)` - Check if already claimed
- `get_merkle_root(campaign_id)` - Get campaign root

### Client Side (`client/`)
```
scripts/
  generateKey.ts      - Generate app key pair
  setupCampaign.ts    - Build merkle tree & proofs

src/utils/merkle/
  leafHasher.ts       - Hash leaf data (Poseidon + Pedersen)
  merkleTree.ts       - Build merkle tree
  proofGenerator.ts   - Generate & verify proofs
  signatureGenerator.ts - Sign claims with app key

src/components/
  ClaimButton.tsx     - React claim UI

assets/
  snapshot.json       - INPUT: Eligible addresses
  claimData.json      - OUTPUT: Proofs + signatures
```

---

## 🔒 Security Features

✅ **Merkle Proof Verification** - Proves address is in snapshot
✅ **Signature Verification** - Proves app authorized claim
✅ **Double-Claim Prevention** - Each leaf can only be claimed once
✅ **Caller Validation** - Only the eligible address can claim
✅ **Campaign Management** - Support multiple concurrent drops

---

## 🎯 How It Works

```
┌─────────────┐
│  Snapshot   │  List of eligible addresses
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Merkle Tree │  Build tree, get root
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Proofs    │  Generate for each address
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Signatures  │  Sign each leaf with app key
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Contract   │  Initialize with merkle root
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    User     │  Claims with proof + signature
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Verify    │  ✓ Proof  ✓ Signature  ✓ Not claimed
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Success!   │  Emit Claimed event
└─────────────┘
```

---

## 📝 Example Usage

### Admin Setup
```typescript
// 1. Generate keys
const privateKey = generatePrivateKey();
const publicKey = getPublicKey(privateKey);

// 2. Build tree
const tree = buildMerkleTree(snapshot);

// 3. Generate proofs
const proof = generateProof(tree, 0);

// 4. Sign leaf
const signature = signLeafHash(leafHash, privateKey);
```

### User Claim
```typescript
// Load claim data
const userClaim = claimData.claims.find(
  c => c.address === userAddress
);

// Submit claim
await contract.claim(
  campaignId,
  {
    address: userClaim.address,
    index: userClaim.index,
    claim_data: userClaim.claim_data
  },
  userClaim.proof,
  userClaim.signature.r,
  userClaim.signature.s
);
```

---

## 🐛 Common Issues

**"Campaign not initialized"**
→ Run `initialize_drop()` with merkle root from `claimData.json`

**"Invalid merkle proof"**
→ Merkle root in contract doesn't match `claimData.json`
→ Re-run `setup-campaign` and update contract

**"Invalid signature"**
→ Public key in contract doesn't match private key used
→ Verify keys match between `generateKey` and `set_app_public_key`

**"Already claimed"**
→ This address successfully claimed already
→ Each address can only claim once per campaign

---

## 🔗 Key Files Reference

| File | Purpose |
|------|---------|
| `assets/snapshot.json` | INPUT: Who can claim |
| `assets/claimData.json` | OUTPUT: How to claim |
| `src/systems/actions.cairo` | Claim verification logic |
| `client/src/components/ClaimButton.tsx` | User interface |
| `client/scripts/setupCampaign.ts` | Generate campaign data |

---

## 📚 Next Steps

1. **Test Locally**: Use Starknet devnet
2. **Add More Addresses**: Expand snapshot
3. **Customize Claim Data**: Change `claim_data` format
4. **Deploy to Testnet**: Test with real users
5. **Launch on Mainnet**: Go live!

For detailed documentation, see `client/MERKLE_DROP_SETUP.md`
