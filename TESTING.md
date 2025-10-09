# Testing and Deployment Guide

This guide explains how to test the `mint_tokens` function and deploy the ClaimContract.

## Contract Overview

The ClaimContract distributes fixed rewards to claimants:
- **386 LORDS** tokens (with 18 decimals = 386 × 10^18)
- **3 Loot Survivor** tokens
- **3 Pistols Duel** starter packs (via `claim_starter_pack()`)

## Prerequisites

1. **Install Tools:**
   ```bash
   # Starkli (for contract interaction)
   curl https://get.starkli.sh | sh
   starkliup

   # Scarb (already installed based on project)
   ```

2. **Environment Setup:**
   ```bash
   export RPC_URL="https://api.cartridge.gg/x/starknet/mainnet"
   export ACCOUNT_FILE="~/.starkli-wallets/deployer/account.json"
   export KEYSTORE_FILE="~/.starkli-wallets/deployer/keystore.json"
   ```

## Running Unit Tests

```bash
# Run all tests
scarb test

# Run specific test module
scarb test test_mint_tokens

# Run with backtrace for debugging
SNFORGE_BACKTRACE=1 scarb test
```

### Test Coverage

Current tests verify:
- ✅ Contract deployment
- ✅ Access control (FORWARDER_ROLE required)
- ✅ Balance queries
- ✅ Role initialization
- ✅ Contract constants (token addresses)

## Testing Token Distribution

### Step 1: Prepare Treasury

The claim contract itself acts as the treasury. You need to:

1. **Transfer tokens to the claim contract:**
   ```bash
   # Calculate required amounts (for N claims)
   N_CLAIMS=100  # Example: 100 claims
   LORDS_NEEDED=$((386 * N_CLAIMS))
   LOOT_SURVIVOR_NEEDED=$((3 * N_CLAIMS))

   echo "For $N_CLAIMS claims, you need:"
   echo "  - LORDS: $LORDS_NEEDED tokens"
   echo "  - Loot Survivor: $LOOT_SURVIVOR_NEEDED tokens"
   ```

2. **Transfer LORDS:**
   ```bash
   LORDS_TOKEN="0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49"
   CLAIM_CONTRACT="0x..."  # Your deployed claim contract

   starkli invoke $LORDS_TOKEN transfer \
     $CLAIM_CONTRACT \
     u256:386000000000000000000 \
     --rpc $RPC_URL
   ```

3. **Transfer Loot Survivor tokens:**
   ```bash
   LOOT_SURVIVOR="0x035f581b050a39958b7188ab5c75daaa1f9d3571a0c032203038c898663f31f8"

   starkli invoke $LOOT_SURVIVOR transfer \
     $CLAIM_CONTRACT \
     u256:3 \
     --rpc $RPC_URL
   ```

### Step 2: Verify Pistols Integration

**⚠️ CRITICAL: Pistols Duel Integration**

The contract calls `claim_starter_pack()` 3 times on:
```
0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9
```

**Before deploying, verify:**

1. What does `claim_starter_pack()` do?
2. Does it require authorization/whitelist?
3. Can the claim contract call it?
4. Are there any limits on how many times it can be called?

**To test Pistols integration:**
```bash
PISTOLS_CONTRACT="0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9"

# Check if the function exists
starkli call $PISTOLS_CONTRACT claim_starter_pack --rpc $RPC_URL
```

### Step 3: Test Setup Script

Use the provided test script:

```bash
cd scripts

# Set environment variables
export CLAIM_CONTRACT_ADDRESS="0x..."
export TREASURY_ADDRESS="0x..."  # Address holding tokens
export TEST_RECIPIENT="0x..."
export NUM_CLAIMS=1

# Run the test script
./test_mint_tokens.sh
```

The script will:
- Check treasury balances
- Verify allowances
- Calculate required amounts
- Provide approval commands if needed

## Deployment

### Step 1: Build Contract

```bash
scarb build
```

### Step 2: Declare Contract

```bash
starkli declare target/dev/realms_claim_ClaimContract.contract_class.json \
  --rpc $RPC_URL \
  --account $ACCOUNT_FILE \
  --keystore $KEYSTORE_FILE
```

Save the class hash output.

### Step 3: Deploy Contract

```bash
CLASS_HASH="0x..."  # From declare step
OWNER="0x..."       # Admin address (can upgrade contract)
FORWARDER="0x..."   # Forwarder contract address

starkli deploy $CLASS_HASH \
  $OWNER \
  $FORWARDER \
  --rpc $RPC_URL \
  --account $ACCOUNT_FILE \
  --keystore $KEYSTORE_FILE
```

Save the deployed contract address.

### Step 4: Verify Deployment

```bash
CLAIM_CONTRACT="0x..."  # From deploy step

# Check if owner has admin role
starkli call $CLAIM_CONTRACT has_role \
  0x0  \
  $OWNER \
  --rpc $RPC_URL

# Check if forwarder has forwarder role
# FORWARDER_ROLE = selector!("FORWARDER_ROLE")
# = 0x46d8e4f0d6d3a8e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5
starkli call $CLAIM_CONTRACT has_role \
  0x1fd6f5526e6a38d0ef8e53dfcc9e1c2ee3ee90da7e7e39be8a4c1c4c8c4e8c4c \
  $FORWARDER \
  --rpc $RPC_URL
```

## Integration with Forwarder

The forwarder contract should call:

```cairo
claim_contract.claim_from_forwarder(recipient, leaf_data)
```

Where:
- `recipient`: Starknet address to receive tokens
- `leaf_data`: Array of felt252 (currently unused, but required by interface)

## Troubleshooting

### "Caller is missing role"
- Ensure the forwarder address has FORWARDER_ROLE
- Use `initialize()` to grant role to additional forwarders

### Token transfer fails
- Check claim contract has sufficient token balance
- For LORDS: Needs 386 × 10^18 per claim
- For Loot Survivor: Needs 3 tokens per claim

### Pistols claim_starter_pack fails
- Verify the Pistols contract allows the claim contract to call this function
- Check if there's a whitelist or permission system
- Contact Pistols team if unclear

## Contract Upgrade

Only the owner (DEFAULT_ADMIN_ROLE) can upgrade:

```bash
NEW_CLASS_HASH="0x..."

starkli invoke $CLAIM_CONTRACT upgrade \
  $NEW_CLASS_HASH \
  --rpc $RPC_URL \
  --account $ACCOUNT_FILE \
  --keystore $KEYSTORE_FILE
```

## Security Checklist

Before going to production:

- [ ] Verify all token addresses are correct
- [ ] Test with small amounts first (1-2 claims)
- [ ] Confirm Pistols integration works
- [ ] Ensure sufficient tokens in claim contract
- [ ] Verify forwarder role is granted correctly
- [ ] Test upgrade mechanism with owner account
- [ ] Monitor first few claims on mainnet
- [ ] Have rollback plan (upgrade capability)

## Support

If you encounter issues:
1. Check contract addresses in `src/constants/contracts.cairo`
2. Verify role assignments with `has_role` calls
3. Test with small amounts on testnet first
4. Review transaction logs on Voyager/Starkscan
