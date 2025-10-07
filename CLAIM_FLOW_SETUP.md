# Complete Claim Flow Setup Guide

This guide walks you through setting up the complete claim flow from wallet connection to successful claim execution.

## Overview

The claim flow consists of:
1. **Smart Contract Deployment** (Starknet)
2. **Campaign Setup** (Merkle tree generation)
3. **Frontend Integration** (Claim UI)
4. **Testing** (End-to-end verification)

---

## Prerequisites

✅ You already have:
- Ethereum wallet connection working
- Starknet wallet connection working
- Contract code in `src/systems/actions.cairo`

---

## Step-by-Step Setup

### Step 1: Generate App Keypair 🔑

The app needs a keypair to sign claims.

```bash
cd client
bun run generate-key
```

**Output:**
```
🔑 Generating new key pair...

Private Key (KEEP SECRET):
0x1234567890abcdef...

Public Key (set in contract):
0xabcdef1234567890...

💡 Add this to your .env:
APP_PRIVATE_KEY=0x1234567890abcdef...
```

**Action Required:**
1. Copy the `APP_PRIVATE_KEY` to `client/.env`
2. **Save the public key** - you'll need it for the contract
3. **Never commit** the private key to git (already in `.gitignore`)

```bash
# client/.env
APP_PRIVATE_KEY=0x1234567890abcdef...
```

---

### Step 2: Build and Deploy Contract 🚀

#### Option A: Deploy to Katana (Local Testing)

**Start Katana:**
```bash
# In project root
katana --disable-fee
```

**Deploy contract:**
```bash
sozo build
sozo migrate apply
```

**Get contract address:**
```bash
sozo inspect actions
# Copy the contract address
```

#### Option B: Deploy to Sepolia (Testnet)

**Update `Scarb.toml`:**
```toml
[tool.dojo.env]
rpc_url = "https://api.cartridge.gg/x/starknet/sepolia"
account_address = "YOUR_ACCOUNT_ADDRESS"
private_key = "YOUR_PRIVATE_KEY"  # Or use keystore
```

**Deploy:**
```bash
sozo build
sozo migrate apply --rpc-url https://api.cartridge.gg/x/starknet/sepolia
```

**Important:** Note your deployed contract address!

---

### Step 3: Initialize Contract 🎯

You need to call two functions on the deployed contract:

#### 3a. Set App Public Key

```bash
# Using sozo
sozo execute actions set_app_public_key \
  --calldata 0xYOUR_PUBLIC_KEY

# The public key from Step 1
```

**Or using TypeScript (recommended):**

Create `client/scripts/initializeContract.ts`:
```typescript
import { Contract, RpcProvider } from 'starknet';
import actionsAbi from '../src/abis/actions.json'; // You'll need to export this

const provider = new RpcProvider({
  nodeUrl: 'https://api.cartridge.gg/x/starknet/sepolia'
});

const contractAddress = '0xYOUR_CONTRACT_ADDRESS';
const publicKey = '0xYOUR_PUBLIC_KEY'; // From Step 1

const contract = new Contract(actionsAbi, contractAddress, provider);

// Set public key
await contract.set_app_public_key(publicKey);
console.log('✅ Public key set!');
```

#### 3b. Initialize Campaign

```bash
# Using sozo
sozo execute actions initialize_drop \
  --calldata CAMPAIGN_1 0xMERKLE_ROOT

# You'll get the merkle root in Step 4
```

---

### Step 4: Prepare Snapshot and Generate Campaign Data 📋

#### 4a. Update Snapshot

Edit `assets/snapshot.json` with real eligible addresses:

```json
[
  {
    "address": "0x05f3c0645a554b1b867c4d5e7c14ac4537de8d2d8e98b7d3e8b0c3e7a0f4b8e9",
    "index": 0,
    "claim_data": ["100", "200"]  // Amount tokens, NFTs, etc.
  },
  {
    "address": "0x02c4d3c5e6f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
    "index": 1,
    "claim_data": ["150", "250"]
  }
]
```

**Important:** Use real Starknet addresses that will claim!

#### 4b. Generate Campaign Data

```bash
cd client
bun run setup-campaign
```

**Output:**
```
🚀 Starting campaign setup...

📋 Loading snapshot...
   Found 5 addresses in snapshot
   ✓ All entries validated

🔑 Generating public key...
   Public Key: 0xabc123...
   ⚠️  Set this in the contract using set_app_public_key()

🌳 Building Merkle tree...
   Merkle Root: 0x789def...
   Tree depth: 2
   ⚠️  Initialize drop with this root using initialize_drop()

📝 Generating proofs and signatures...
   ✓ [0] 0x05f3c064...
   ✓ [1] 0x02c4d3c5...
   Generated 5 claim entries

💾 Saving claim data...
   Saved to: /assets/claimData.json

✅ Campaign setup complete!

📋 Next steps:
   1. Deploy your contract
   2. Call set_app_public_key(0xabc123...)
   3. Call initialize_drop("CAMPAIGN_1", 0x789def...)
   4. Users can now claim using the generated proof data
```

**Important:**
- Copy the **Merkle Root** - use it in Step 3b
- The script creates `assets/claimData.json` with all proofs and signatures

---

### Step 5: Update Client Configuration ⚙️

Update `client/.env`:

```bash
# Contract Address from Step 2
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Campaign ID (matches setupCampaign.ts)
VITE_CAMPAIGN_ID=CAMPAIGN_1

# WalletConnect (already set)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# App Private Key (from Step 1)
APP_PRIVATE_KEY=0x...
```

---

### Step 6: Implement Claim Functionality 💻

The `ClaimButton` component needs to be completed and integrated.

#### 6a. Complete ClaimButton Implementation

Update `client/src/components/ClaimButton.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useAccount, useContractWrite } from '@starknet-react/core';
import { Contract } from 'starknet';

// Import your contract ABI
import actionsAbi from '../abis/actions.json';

export function ClaimButton() {
  const { address, isConnected } = useAccount();
  const [claimData, setClaimData] = useState<any>(null);
  const [userClaim, setUserClaim] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  // Load claim data
  useEffect(() => {
    fetch('/assets/claimData.json')
      .then(res => res.json())
      .then(data => {
        setClaimData(data);
        // Find user's claim
        if (address) {
          const claim = data.claims.find(
            (c: any) => c.address.toLowerCase() === address.toLowerCase()
          );
          setUserClaim(claim || null);
        }
      });
  }, [address]);

  const handleClaim = async () => {
    if (!userClaim || !address || !claimData) return;

    setClaiming(true);
    try {
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

      // Create contract instance
      const contract = new Contract(
        actionsAbi,
        contractAddress,
        // provider from starknet-react
      );

      // Prepare leaf data
      const leafData = {
        address: userClaim.address,
        index: userClaim.index,
        claim_data: userClaim.claim_data
      };

      // Call claim function
      const tx = await contract.claim(
        claimData.campaignId,
        leafData,
        userClaim.proof,
        userClaim.signature.r,
        userClaim.signature.s
      );

      // Wait for transaction
      await provider.waitForTransaction(tx.transaction_hash);

      alert('✅ Claim successful!');
    } catch (error: any) {
      console.error('Claim error:', error);
      alert(`❌ Claim failed: ${error.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!isConnected) {
    return <div>Please connect your Starknet wallet</div>;
  }

  if (!userClaim) {
    return <div>Address not eligible for claim</div>;
  }

  return (
    <button onClick={handleClaim} disabled={claiming}>
      {claiming ? 'Claiming...' : 'Claim Now'}
    </button>
  );
}
```

#### 6b. Export Contract ABI

You need to export the contract ABI from your build:

```bash
# After sozo build, the ABI is in:
cat target/dev/dojo_starter_actions.contract_class.json | jq '.abi' > client/src/abis/actions.json
```

#### 6c. Add ClaimButton to WalletDashboard

Update `client/src/components/WalletDashboard.tsx`:

```typescript
import { ClaimButton } from './ClaimButton';

// Inside WalletDashboard component, add after wallet cards:
{starknetAddress && (
  <div className="mt-8">
    <ClaimButton />
  </div>
)}
```

---

### Step 7: Test the Complete Flow 🧪

#### 7a. Pre-flight Checks

```bash
# Check contract is deployed
sozo inspect actions

# Check public key is set (should not be 0)
sozo call actions get_merkle_root --calldata CAMPAIGN_1

# Check claim data exists
cat client/assets/claimData.json | jq '.totalClaims'
```

#### 7b. Test Claim Flow

1. **Start Frontend:**
   ```bash
   cd client
   bun run dev
   ```

2. **Connect Wallet:**
   - Open `http://localhost:5173`
   - Connect Starknet wallet (Cartridge Controller)
   - Ensure your address matches one in `snapshot.json`

3. **Attempt Claim:**
   - Click "Claim Now" button
   - Approve transaction in wallet
   - Wait for confirmation

4. **Verify Success:**
   ```bash
   # Check if claimed
   sozo call actions is_claimed --calldata 0xLEAF_HASH
   # Should return: true
   ```

#### 7c. Test Edge Cases

**Test 1: Double Claim Prevention**
- Try claiming twice with same address
- Should fail with "Already claimed"

**Test 2: Invalid Address**
- Connect with address NOT in snapshot
- Should show "Not eligible"

**Test 3: Wrong Signature**
- Manually modify signature in claimData.json
- Should fail with "Invalid signature"

---

## Troubleshooting 🔧

### Issue: "Campaign not initialized"
**Fix:** Make sure you called `initialize_drop` with the correct merkle root from Step 4b.

### Issue: "Invalid signature"
**Fix:**
1. Check `APP_PRIVATE_KEY` in `.env` matches the key used in `setup-campaign`
2. Regenerate campaign data: `bun run setup-campaign`

### Issue: "App public key not set"
**Fix:** Call `set_app_public_key` with the public key from Step 1.

### Issue: "Invalid merkle proof"
**Fix:**
1. Ensure snapshot.json has correct addresses
2. Regenerate campaign: `bun run setup-campaign`
3. Re-initialize campaign with new merkle root

### Issue: Contract address not found
**Fix:**
1. Check `VITE_CONTRACT_ADDRESS` in `.env`
2. Verify contract is deployed: `sozo inspect actions`

### Issue: ClaimButton not showing
**Fix:**
1. Make sure you're connected with Starknet (not Ethereum)
2. Check your address is in snapshot.json
3. Verify claimData.json exists in `assets/`

---

## Security Checklist ✅

Before production:

- [ ] **Add Access Control** to `set_app_public_key` and `initialize_drop`
- [ ] **Prevent Campaign Overwrites** - check if campaign exists
- [ ] **Implement Emergency Pause** mechanism
- [ ] **Add Campaign Time Bounds** (start/end dates)
- [ ] **Validate claim_data** array contents
- [ ] **Test on Testnet** thoroughly
- [ ] **Audit Smart Contracts** (see SECURITY_AUDIT.md)
- [ ] **Never commit** `APP_PRIVATE_KEY` to git
- [ ] **Use secure key management** for production private key

---

## Production Deployment 🚀

For production:

1. **Use Hardware Wallet** or secure key management service for `APP_PRIVATE_KEY`
2. **Deploy to Mainnet:**
   ```bash
   sozo migrate apply --rpc-url https://api.cartridge.gg/x/starknet/mainnet
   ```
3. **Use Multi-sig** for admin functions (set_app_public_key, initialize_drop)
4. **Monitor Events:**
   - Listen for `Claimed` events
   - Track `DropInitialized` and `AppPublicKeySet` events
5. **Set up Indexer** to track claims off-chain
6. **Create Admin Dashboard** for campaign management

---

## Quick Reference Commands 📝

```bash
# Generate keypair
bun run generate-key

# Setup campaign
bun run setup-campaign

# Build contract
sozo build

# Deploy contract
sozo migrate apply

# Set public key
sozo execute actions set_app_public_key --calldata 0xPUBLIC_KEY

# Initialize campaign
sozo execute actions initialize_drop --calldata CAMPAIGN_1 0xMERKLE_ROOT

# Check if claimed
sozo call actions is_claimed --calldata 0xLEAF_HASH

# Start frontend
cd client && bun run dev
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     USER (Browser)                       │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   Ethereum   │         │   Starknet   │             │
│  │    Wallet    │         │    Wallet    │             │
│  └──────────────┘         └──────────────┘             │
└─────────────────────────────────────────────────────────┘
                              │
                              │ connects
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  WalletDashboard                                   │ │
│  │    ├─ EthereumConnect                              │ │
│  │    ├─ StarknetConnect                              │ │
│  │    └─ ClaimButton ◄── reads claimData.json        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                              │ calls claim()
                              ▼
┌─────────────────────────────────────────────────────────┐
│              Starknet Smart Contract                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  actions.cairo                                     │ │
│  │    ├─ set_app_public_key() ◄── admin only         │ │
│  │    ├─ initialize_drop() ◄── admin only            │ │
│  │    └─ claim() ◄── verifies:                       │ │
│  │          • Caller matches leaf address             │ │
│  │          • Campaign is active                      │ │
│  │          • Not already claimed                     │ │
│  │          • Valid Merkle proof                      │ │
│  │          • Valid signature                         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
                              │ emits
                              ▼
                        Claimed Event
```

---

## Next Steps After Setup

1. **Test locally** with Katana
2. **Deploy to Sepolia** testnet
3. **Fix security issues** from SECURITY_AUDIT.md
4. **Add admin dashboard** for campaign management
5. **Implement claim history** UI
6. **Add analytics** tracking
7. **Deploy to Mainnet** 🎉

---

**Need Help?**
- Review `SECURITY_AUDIT.md` for security considerations
- Check `WALLET_SETUP.md` for wallet connection issues
- See `QUICK_START_WALLETS.md` for UI reference
- Open an issue on GitHub
