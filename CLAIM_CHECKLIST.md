# Claim Flow Setup Checklist ✅

Use this checklist to set up your claim flow step-by-step.

## ✅ Prerequisites (Already Done!)
- [x] Ethereum wallet connection working
- [x] Starknet wallet connection working
- [x] Contract code exists in `src/systems/actions.cairo`
- [x] Client utilities exist in `client/src/utils/merkle/`
- [x] Scripts exist in `client/scripts/`

---

## 📝 Setup Steps

### 1️⃣ Generate App Keypair
```bash
cd client
bun run generate-key
```
- [ ] Copy `APP_PRIVATE_KEY` to `client/.env`
- [ ] Save the public key (you'll need it for the contract)
- [ ] Verify `.env` has the private key

**Expected output:**
```
Private Key: 0x1234...
Public Key: 0xabcd...
```

---

### 2️⃣ Deploy Contract

**Option A: Local (Katana)**
```bash
# Terminal 1: Start Katana
katana --disable-fee

# Terminal 2: Deploy
sozo build
sozo migrate apply
```

**Option B: Sepolia Testnet**
```bash
sozo build
sozo migrate apply --rpc-url https://api.cartridge.gg/x/starknet/sepolia
```

- [ ] Contract deployed successfully
- [ ] Copy the contract address from output
- [ ] Add to `client/.env` as `VITE_CONTRACT_ADDRESS`

---

### 3️⃣ Set App Public Key in Contract

```bash
sozo execute actions set_app_public_key \
  --calldata YOUR_PUBLIC_KEY_FROM_STEP_1
```

- [ ] Transaction succeeded
- [ ] Public key is set in contract

**Verify:**
```bash
# Should return the public key you set (not 0)
sozo call actions get_merkle_root --calldata CAMPAIGN_1
```

---

### 4️⃣ Prepare Snapshot Data

Edit `assets/snapshot.json` with eligible addresses:

```json
[
  {
    "address": "0xYOUR_STARKNET_ADDRESS_1",
    "index": 0,
    "claim_data": ["100", "200"]
  },
  {
    "address": "0xYOUR_STARKNET_ADDRESS_2",
    "index": 1,
    "claim_data": ["150", "250"]
  }
]
```

- [ ] Added real Starknet addresses
- [ ] Addresses are valid (0x... format)
- [ ] Each has unique index
- [ ] `claim_data` has your reward amounts

---

### 5️⃣ Generate Campaign Data

```bash
cd client
bun run setup-campaign
```

- [ ] Script completes successfully
- [ ] Copy the **Merkle Root** from output
- [ ] Verify `assets/claimData.json` was created
- [ ] Check file has all addresses with proofs

**Expected output:**
```
✅ Campaign setup complete!
Merkle Root: 0x789def...
```

---

### 6️⃣ Initialize Campaign in Contract

```bash
sozo execute actions initialize_drop \
  --calldata CAMPAIGN_1 YOUR_MERKLE_ROOT_FROM_STEP_5
```

- [ ] Transaction succeeded
- [ ] Campaign is initialized

**Verify:**
```bash
sozo call actions get_merkle_root --calldata CAMPAIGN_1
# Should return the merkle root you set (not 0)
```

---

### 7️⃣ Update Client Configuration

Check `client/.env` has all required values:

```bash
# Contract
VITE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
VITE_CAMPAIGN_ID=CAMPAIGN_1

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# App Key
APP_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

- [ ] All values are filled in (no empty values)
- [ ] Contract address is correct
- [ ] Private key matches the one from Step 1

---

### 8️⃣ Export Contract ABI

```bash
# After building, export ABI
mkdir -p client/src/abis
cat target/dev/dojo_starter_actions.contract_class.json | jq '.abi' > client/src/abis/actions.json
```

- [ ] ABI file created at `client/src/abis/actions.json`
- [ ] File is valid JSON

---

### 9️⃣ Update ClaimButton Component

Currently `ClaimButton.tsx` has commented code. You need to:

1. Import contract ABI
2. Complete the `handleClaim` function
3. Add contract interaction code

See `CLAIM_FLOW_SETUP.md` Step 6 for full code example.

- [ ] Uncommented contract call
- [ ] Added ABI import
- [ ] Added provider configuration
- [ ] Added error handling

---

### 🔟 Add ClaimButton to Dashboard

Update `client/src/components/WalletDashboard.tsx`:

```typescript
import { ClaimButton } from './ClaimButton';

// Add after wallet cards:
{starknetAddress && (
  <div className="mt-8">
    <ClaimButton />
  </div>
)}
```

- [ ] ClaimButton imported
- [ ] Added to dashboard
- [ ] Only shows when Starknet wallet connected

---

### 1️⃣1️⃣ Test the Flow

```bash
cd client
bun run dev
```

Open `http://localhost:5173`

**Test Steps:**
1. Connect Starknet wallet
   - [ ] Wallet connects successfully
   - [ ] Address shows in dashboard

2. Check claim eligibility
   - [ ] Uses address from snapshot.json
   - [ ] ClaimButton appears
   - [ ] Shows claim data

3. Execute claim
   - [ ] Click "Claim Now"
   - [ ] Transaction popup appears
   - [ ] Approve transaction
   - [ ] Wait for confirmation
   - [ ] Success message shows

4. Verify claim
   ```bash
   sozo call actions is_claimed --calldata 0xYOUR_LEAF_HASH
   # Should return: true
   ```
   - [ ] Contract shows claimed = true

5. Test double claim
   - [ ] Try claiming again
   - [ ] Should fail with "Already claimed"

---

## 🚨 Troubleshooting

### "Campaign not initialized"
- ✅ Run Step 6 (initialize_drop)
- ✅ Check merkle root is correct

### "Invalid signature"
- ✅ Check APP_PRIVATE_KEY in .env
- ✅ Re-run `bun run setup-campaign`

### "App public key not set"
- ✅ Run Step 3 (set_app_public_key)

### ClaimButton not showing
- ✅ Connect Starknet wallet (not Ethereum)
- ✅ Use address from snapshot.json
- ✅ Check claimData.json exists

### Transaction fails
- ✅ Check contract address in .env
- ✅ Check you're on correct network
- ✅ Check wallet has enough funds for gas

---

## 📊 Verification Commands

```bash
# Check contract deployed
sozo inspect actions

# Check public key set
# (Call any view function that reads AppPublicKey)

# Check campaign initialized
sozo call actions get_merkle_root --calldata CAMPAIGN_1

# Check if address claimed
sozo call actions is_claimed --calldata 0xLEAF_HASH

# View claim data
cat client/assets/claimData.json | jq '.totalClaims'
```

---

## ⚠️ Before Production

Review `SECURITY_AUDIT.md` and fix:
- [ ] Add access control to admin functions
- [ ] Prevent campaign overwrites
- [ ] Add emergency pause mechanism
- [ ] Add campaign time bounds
- [ ] Validate claim_data contents
- [ ] Test thoroughly on testnet
- [ ] Get contract audited

---

## 📚 Additional Resources

- **Full Guide:** `CLAIM_FLOW_SETUP.md`
- **Security Audit:** `SECURITY_AUDIT.md`
- **Wallet Setup:** `WALLET_SETUP.md`
- **Quick Start:** `QUICK_START_WALLETS.md`

---

## ✅ Success Criteria

Your claim flow is working when:
- [x] Contract is deployed
- [x] Public key is set
- [x] Campaign is initialized
- [x] claimData.json exists
- [x] Frontend shows ClaimButton
- [x] User can connect wallet
- [x] User can claim successfully
- [x] Second claim attempt fails
- [x] Event is emitted
- [x] Contract state updates

---

**Current Status:** Complete these steps in order. Check off each item as you go! 🎯
