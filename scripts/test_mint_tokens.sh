#!/bin/bash

# Test script for mint_tokens function in ClaimContract
# This script tests the token distribution functionality independently

set -e

echo "=================================="
echo "Testing ClaimContract mint_tokens"
echo "=================================="
echo ""

# Configuration
RPC_URL="${RPC_URL:-https://api.cartridge.gg/x/starknet/mainnet}"
NETWORK="${NETWORK:-mainnet}"

# Contract addresses (from constants/contracts.cairo)
LORDS_TOKEN="0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49"
LOOT_SURVIVOR="0x035f581b050a39958b7188ab5c75daaa1f9d3571a0c032203038c898663f31f8"
PISTOLS_DUEL="0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9"

# Required environment variables
if [ -z "$CLAIM_CONTRACT_ADDRESS" ]; then
    echo "❌ Error: CLAIM_CONTRACT_ADDRESS not set"
    echo "   Set it with: export CLAIM_CONTRACT_ADDRESS=0x..."
    exit 1
fi

if [ -z "$TREASURY_ADDRESS" ]; then
    echo "❌ Error: TREASURY_ADDRESS not set"
    echo "   This is the address that will hold and approve tokens"
    echo "   Set it with: export TREASURY_ADDRESS=0x..."
    exit 1
fi

if [ -z "$TEST_RECIPIENT" ]; then
    echo "⚠️  Warning: TEST_RECIPIENT not set, using a default test address"
    TEST_RECIPIENT="0x123"
fi

echo "Configuration:"
echo "  RPC: $RPC_URL"
echo "  Network: $NETWORK"
echo "  Claim Contract: $CLAIM_CONTRACT_ADDRESS"
echo "  Treasury: $TREASURY_ADDRESS"
echo "  Test Recipient: $TEST_RECIPIENT"
echo ""

# Check if starkli is installed
if ! command -v starkli &> /dev/null; then
    echo "❌ Error: starkli not found. Please install it first."
    echo "   Visit: https://github.com/xJonathanLEI/starkli"
    exit 1
fi

echo "=================================="
echo "Step 1: Check Treasury Balances"
echo "=================================="

echo ""
echo "Checking LORDS balance..."
starkli call $LORDS_TOKEN balanceOf $TREASURY_ADDRESS --rpc $RPC_URL || echo "Failed to check LORDS balance"

echo ""
echo "Checking Loot Survivor balance..."
starkli call $LOOT_SURVIVOR balanceOf $TREASURY_ADDRESS --rpc $RPC_URL || echo "Failed to check Loot Survivor balance"

echo ""
echo "=================================="
echo "Step 2: Check Allowances"
echo "=================================="

echo ""
echo "Checking LORDS allowance for claim contract..."
starkli call $LORDS_TOKEN allowance $TREASURY_ADDRESS $CLAIM_CONTRACT_ADDRESS --rpc $RPC_URL || echo "Failed to check LORDS allowance"

echo ""
echo "Checking Loot Survivor allowance for claim contract..."
starkli call $LOOT_SURVIVOR allowance $TREASURY_ADDRESS $CLAIM_CONTRACT_ADDRESS --rpc $RPC_URL || echo "Failed to check Loot Survivor allowance"

echo ""
echo "=================================="
echo "Step 3: Required Amounts"
echo "=================================="

echo ""
echo "For each claim, the contract needs to transfer:"
echo "  - LORDS: 386 tokens (386000000000000000000 in wei)"
echo "  - Loot Survivor: 3 tokens"
echo "  - Pistols Duel: 3 starter packs (via claim_starter_pack)"
echo ""

# Calculate required amounts for N claims
NUM_CLAIMS="${NUM_CLAIMS:-1}"
LORDS_PER_CLAIM="386000000000000000000"
LOOT_SURVIVOR_PER_CLAIM="3"

echo "For $NUM_CLAIMS claim(s), you need:"
echo "  - LORDS: $((NUM_CLAIMS * 386)) tokens in treasury"
echo "  - LORDS allowance: At least $LORDS_PER_CLAIM * $NUM_CLAIMS"
echo "  - Loot Survivor: At least $((NUM_CLAIMS * 3)) tokens in treasury"
echo "  - Loot Survivor allowance: At least $((NUM_CLAIMS * 3))"
echo ""

echo "=================================="
echo "Step 4: Pistols Integration Check"
echo "=================================="

echo ""
echo "⚠️  IMPORTANT: Pistols Duel Integration"
echo ""
echo "The contract calls claim_starter_pack() 3 times on Pistols Duel."
echo "Please verify:"
echo "  1. Does the Pistols contract allow the claim contract to call this?"
echo "  2. Is there authorization/whitelist required?"
echo "  3. What does claim_starter_pack() actually do?"
echo ""
echo "Pistols Duel Contract: $PISTOLS_DUEL"
echo ""

read -p "Have you verified Pistols integration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please verify Pistols integration before proceeding."
    exit 1
fi

echo ""
echo "=================================="
echo "Step 5: Approval Instructions"
echo "=================================="

echo ""
echo "If allowances are insufficient, run these commands:"
echo ""
echo "# Approve LORDS (for $NUM_CLAIMS claims):"
echo "starkli invoke $LORDS_TOKEN approve \\"
echo "  $CLAIM_CONTRACT_ADDRESS \\"
echo "  u256:$((LORDS_PER_CLAIM * NUM_CLAIMS)) \\"
echo "  --rpc $RPC_URL"
echo ""
echo "# Approve Loot Survivor (for $NUM_CLAIMS claims):"
echo "starkli invoke $LOOT_SURVIVOR approve \\"
echo "  $CLAIM_CONTRACT_ADDRESS \\"
echo "  u256:$((LOOT_SURVIVOR_PER_CLAIM * NUM_CLAIMS)) \\"
echo "  --rpc $RPC_URL"
echo ""

echo "=================================="
echo "Test Setup Complete"
echo "=================================="
echo ""
echo "✅ All checks done!"
echo ""
echo "To test a claim, ensure:"
echo "  1. Treasury has sufficient token balances"
echo "  2. Treasury has approved claim contract for sufficient amounts"
echo "  3. Forwarder role is granted to the forwarder address"
echo "  4. Pistols integration is verified and working"
echo ""
echo "The actual claim will be triggered by the forwarder contract."
echo "This script only validates the setup requirements."
