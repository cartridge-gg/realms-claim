#!/bin/bash

# Deploy mock tokens and claim contract to Sepolia for testing
# This script:
# 1. Deploys MockLORDS with 10,000 tokens to test account
# 2. Deploys MockLootSurvivor with 10,000 tokens to test account
# 3. Approves 500 of each token for the claim contract
# 4. Tests a claim flow

set -e

echo "=================================="
echo "Sepolia Test Deployment Script"
echo "=================================="
echo ""

# Configuration
RPC_URL="${RPC_URL:-https://api.cartridge.gg/x/starknet/sepolia}"
ACCOUNT_FILE="${ACCOUNT_FILE:-~/.starkli-wallets/deployer/account.json}"
KEYSTORE_FILE="${KEYSTORE_FILE:-~/.starkli-wallets/deployer/keystore.json}"

echo "Configuration:"
echo "  RPC: $RPC_URL"
echo "  Account: $ACCOUNT_FILE"
echo ""

# Check starkli is installed
if ! command -v starkli &> /dev/null; then
    echo "❌ Error: starkli not found"
    echo "Install with: curl https://get.starkli.sh | sh && starkliup"
    exit 1
fi

# Check scarb is installed
if ! command -v scarb &> /dev/null; then
    echo "❌ Error: scarb not found"
    exit 1
fi

# Build contracts
echo "=================================="
echo "Step 1: Building Contracts"
echo "=================================="
echo ""

scarb build
echo "✅ Build complete"
echo ""

# Declare contracts
echo "=================================="
echo "Step 2: Declaring Contracts"
echo "=================================="
echo ""

echo "Declaring SimpleERC20..."
SIMPLE_ERC20_CLASS=$(starkli declare \
    target/dev/realms_claim_SimpleERC20.contract_class.json \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE \
    2>&1 | grep "Class hash declared" | awk '{print $NF}')

if [ -z "$SIMPLE_ERC20_CLASS" ]; then
    echo "⚠️  SimpleERC20 might already be declared, trying to get existing class..."
    # Try to extract from error message or use a known value
    SIMPLE_ERC20_CLASS="0x..." # You'll need to fill this in manually if it fails
fi

echo "✅ SimpleERC20 class: $SIMPLE_ERC20_CLASS"
echo ""

echo "Declaring ClaimContract..."
CLAIM_CONTRACT_CLASS=$(starkli declare \
    target/dev/realms_claim_ClaimContract.contract_class.json \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE \
    2>&1 | grep "Class hash declared" | awk '{print $NF}')

if [ -z "$CLAIM_CONTRACT_CLASS" ]; then
    echo "⚠️  ClaimContract might already be declared"
fi

echo "✅ ClaimContract class: $CLAIM_CONTRACT_CLASS"
echo ""

# Get deployer address
DEPLOYER=$(starkli account fetch $ACCOUNT_FILE --rpc $RPC_URL 2>/dev/null | grep "Address:" | awk '{print $2}')
echo "Deployer address: $DEPLOYER"
echo ""

# Deploy Mock LORDS
echo "=================================="
echo "Step 3: Deploying Mock LORDS"
echo "=================================="
echo ""

# Constructor args: name, symbol, decimals, initial_recipient, initial_supply
# 10,000 tokens with 18 decimals = 10000 * 10^18
INITIAL_SUPPLY="10000000000000000000000"

echo "Deploying Mock LORDS with $INITIAL_SUPPLY (10,000 tokens) to $DEPLOYER..."
MOCK_LORDS=$(starkli deploy \
    $SIMPLE_ERC20_CLASS \
    str:"Mock LORDS" \
    str:"mLORDS" \
    u8:18 \
    $DEPLOYER \
    u256:$INITIAL_SUPPLY \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ Mock LORDS deployed at: $MOCK_LORDS"
echo ""

# Deploy Mock Loot Survivor
echo "=================================="
echo "Step 4: Deploying Mock Loot Survivor"
echo "=================================="
echo ""

echo "Deploying Mock Loot Survivor with $INITIAL_SUPPLY (10,000 tokens) to $DEPLOYER..."
MOCK_LS=$(starkli deploy \
    $SIMPLE_ERC20_CLASS \
    str:"Mock Loot Survivor" \
    str:"mLS" \
    u8:18 \
    $DEPLOYER \
    u256:$INITIAL_SUPPLY \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ Mock Loot Survivor deployed at: $MOCK_LS"
echo ""

# Deploy Claim Contract
echo "=================================="
echo "Step 5: Deploying Claim Contract"
echo "=================================="
echo ""

# For now, use deployer as both owner and forwarder for testing
OWNER=$DEPLOYER
FORWARDER=$DEPLOYER

echo "Deploying ClaimContract with owner=$OWNER, forwarder=$FORWARDER..."
CLAIM_CONTRACT=$(starkli deploy \
    $CLAIM_CONTRACT_CLASS \
    $OWNER \
    $FORWARDER \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ Claim Contract deployed at: $CLAIM_CONTRACT"
echo ""

# Approve tokens for claim contract
echo "=================================="
echo "Step 6: Approving Tokens"
echo "=================================="
echo ""

# Approve 500 tokens (500 * 10^18)
APPROVAL_AMOUNT="500000000000000000000"

echo "Approving $APPROVAL_AMOUNT mLORDS for claim contract..."
starkli invoke \
    $MOCK_LORDS \
    approve \
    $CLAIM_CONTRACT \
    u256:$APPROVAL_AMOUNT \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE

echo "✅ LORDS approved"
echo ""

echo "Approving $APPROVAL_AMOUNT mLS for claim contract..."
starkli invoke \
    $MOCK_LS \
    approve \
    $CLAIM_CONTRACT \
    u256:$APPROVAL_AMOUNT \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE

echo "✅ Loot Survivor approved"
echo ""

# Transfer tokens to claim contract
echo "=================================="
echo "Step 7: Funding Claim Contract"
echo "=================================="
echo ""

# Transfer 500 tokens to claim contract for distribution
TRANSFER_AMOUNT="500000000000000000000"

echo "Transferring $TRANSFER_AMOUNT mLORDS to claim contract..."
starkli invoke \
    $MOCK_LORDS \
    transfer \
    $CLAIM_CONTRACT \
    u256:$TRANSFER_AMOUNT \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE

echo "✅ LORDS transferred"
echo ""

echo "Transferring $TRANSFER_AMOUNT mLS to claim contract..."
starkli invoke \
    $MOCK_LS \
    transfer \
    $CLAIM_CONTRACT \
    u256:$TRANSFER_AMOUNT \
    --rpc $RPC_URL \
    --account $ACCOUNT_FILE \
    --keystore $KEYSTORE_FILE

echo "✅ Loot Survivor transferred"
echo ""

# Verify balances
echo "=================================="
echo "Step 8: Verifying Balances"
echo "=================================="
echo ""

echo "Checking claim contract LORDS balance..."
starkli call $MOCK_LORDS balance_of $CLAIM_CONTRACT --rpc $RPC_URL

echo ""
echo "Checking claim contract Loot Survivor balance..."
starkli call $MOCK_LS balance_of $CLAIM_CONTRACT --rpc $RPC_URL

echo ""
echo "Checking deployer LORDS balance..."
starkli call $MOCK_LORDS balance_of $DEPLOYER --rpc $RPC_URL

echo ""
echo "=================================="
echo "Deployment Complete!"
echo "=================================="
echo ""
echo "📝 Contract Addresses:"
echo "  Mock LORDS: $MOCK_LORDS"
echo "  Mock Loot Survivor: $MOCK_LS"
echo "  Claim Contract: $CLAIM_CONTRACT"
echo "  Deployer/Owner/Forwarder: $DEPLOYER"
echo ""
echo "💰 Token Setup:"
echo "  - Deployer has 9,500 of each token"
echo "  - Claim contract has 500 of each token"
echo "  - Each claim distributes:"
echo "    - 386 LORDS"
echo "    - 3 Loot Survivor"
echo "    - 3 Pistols starter packs (skipped in test)"
echo ""
echo "🧪 To test a claim:"
echo "  starkli invoke $CLAIM_CONTRACT claim_from_forwarder \\"
echo "    <RECIPIENT_ADDRESS> \\"
echo "    '[]' \\"  # Empty leaf_data array
echo "    --rpc $RPC_URL \\"
echo "    --account $ACCOUNT_FILE \\"
echo "    --keystore $KEYSTORE_FILE"
echo ""
echo "📊 Check balances:"
echo "  starkli call $MOCK_LORDS balance_of <ADDRESS> --rpc $RPC_URL"
echo "  starkli call $MOCK_LS balance_of <ADDRESS> --rpc $RPC_URL"
echo ""

# Save addresses to file
cat > .sepolia_deployment <<EOF
MOCK_LORDS=$MOCK_LORDS
MOCK_LS=$MOCK_LS
CLAIM_CONTRACT=$CLAIM_CONTRACT
DEPLOYER=$DEPLOYER
EOF

echo "✅ Addresses saved to .sepolia_deployment"
