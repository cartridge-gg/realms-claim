# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Merkle Drop claim system** for cross-chain token distribution. It allows Ethereum addresses to claim tokens/NFTs on Starknet using:
- **Merkle proofs** for efficient on-chain verification
- **Ethereum signatures** to bind claims to Starknet recipients
- **Forwarder pattern** for secure cross-chain claims

The system has two main components:
1. **Cairo Contracts** (Starknet): Forwarder and Consumer contracts
2. **React Client** (TypeScript): Frontend for eligibility checking and claiming

## Key Commands

### Contract Development (Cairo)

```bash
# Build contracts
scarb build

# Run tests
scarb test
# or
snforge test

# Format code
scarb fmt
```

### Client Development (React/TypeScript)

```bash
cd client

# Install dependencies
bun install

# Development server
bun run dev

# Build for production
bun run build

# Lint
bun run lint

# Generate app keypair (for signing claims)
bun run generate-key

# Transform snapshot data
bun run transform-snapshot

# Setup campaign (generate merkle tree & proofs)
bun run setup-campaign

# Test claim flow
bun run test:claim-flow
```

## Architecture

### Contract Layer (Cairo)

The contract implementation follows a **forwarder-consumer pattern**:

**Forwarder Contract** (`src/forwarder/`)
- `component.cairo`: Core verification logic
  - `verify_and_forward_ethereum()`: Main entry point for claims
  - Verifies Ethereum signatures that bind ETH addresses to Starknet recipients
  - Validates Merkle proofs against stored roots
  - Prevents double-claiming via `fallen_leaves_hashes` map
- `signature.cairo`: Ethereum signature verification using ECDSA recovery
- Storage: Maps `MerkleTreeKey → merkle_root` and `(MerkleTreeKey, leaf_hash) → is_consumed`

**Consumer Contract** (`src/consumer/`)
- `example.cairo`: Sample implementation that handles actual token distribution
- Must verify caller is the forwarder contract
- Receives `recipient` (Starknet address) and `leaf_data` (claim details)
- Implements custom distribution logic (mint NFTs, transfer tokens, etc.)

**Type System** (`src/types/`)
- `leaf.cairo`: `LeafData<T>` structure containing:
  - `address`: Generic (EthAddress or ContractAddress)
  - `index`: Unique position in snapshot
  - `claim_contract_address`: Target consumer contract
  - `entrypoint`: Function to call on consumer
  - `data`: Array of claim parameters (amounts, token IDs, etc.)
- `LeafDataHashImpl`: Hashes leaf using Poseidon + Pedersen (matches client-side hashing)
- `merkle.cairo`: `MerkleTreeKey` uniquely identifies a drop
- `signature.cairo`: `EthereumSignature` with (v, r, s) components

### Client Layer (TypeScript/React)

**Wallet Integration** (`src/stores/provider.tsx`)
- **Starknet**: Cartridge Controller via `@starknet-react/core`
- **Ethereum**: WalletConnect v2 via `wagmi` and `@reown/appkit`
- Dual wallet support required for cross-chain claims

**Snapshot Structure** (`src/data/snapshot.json`)
```json
{
  "claim_contract": "0x...",
  "entrypoint": "claim_from_forwarder",
  "merkle_root": "0x...",
  "chain_id": "0x1",
  "network": "Ethereum",
  "snapshot": [
    ["0xETH_ADDRESS", ["data_item_1", "data_item_2", ...]]
  ]
}
```

**Critical Implementation Details:**

The snapshot format is currently **missing the index field**. The proper format should be:
```json
["0xETH_ADDRESS", index_number, ["data_item_1", "data_item_2", ...]]
```

**Merkle Tree Utilities** (`src/utils/`)
- `leafHasher.ts`: Hash leaf data (must match Cairo `LeafDataHashImpl`)
  - Current: Hashes `[address, index, data_length, ...data]`
  - **Required**: Should hash `[address, index, claim_contract, entrypoint, data_length, ...data]`
  - Uses Poseidon hash followed by Pedersen hash
- `merkleTree.ts`: Build tree and generate proofs using sorted Pedersen hashing
- `ethereumSigning.ts`: Create and verify Ethereum signatures
- `merkle/signatureGenerator.ts`: Starknet ECDSA signing with app private key

**Components** (`src/components/`)
- `EligibilityChecker.tsx`: Main UI component
  - Loads snapshot and checks if connected address is eligible
  - Generates Merkle proof and leaf hash
  - Shows signing demo with 4 steps:
    1. Generate leaf hash
    2. Generate Merkle proof
    3. Sign with app private key (currently implemented)
    4. Sign ownership message with Ethereum wallet
- `connect-eth.tsx`: Ethereum wallet connection UI
- `connect-stark.tsx`: Starknet wallet connection UI

### Claim Flow

1. **Setup Phase** (Admin, one-time):
   - Generate app keypair: `bun run generate-key`
   - Create snapshot with eligible addresses
   - Run `bun run setup-campaign` to build Merkle tree
   - Deploy contracts to Starknet
   - Initialize forwarder with Merkle root

2. **Claim Phase** (User):
   - Connect Ethereum wallet → check eligibility
   - Connect Starknet wallet → specify recipient
   - Sign message with Ethereum wallet: `"Claim on starknet with: {sn_address}"`
   - Submit transaction to forwarder contract with:
     - `merkle_tree_key`: Identifies the drop
     - `proof`: Array of sibling hashes
     - `leaf_data`: Address, index, contract, entrypoint, data
     - `recipient`: Starknet address to receive tokens
     - `eth_signature`: (v, r, s) components

3. **Verification** (On-chain):
   - Verify Ethereum signature binds ETH address → Starknet recipient
   - Hash leaf data (must match client-side hash)
   - Check leaf not already consumed
   - Verify Merkle proof against stored root
   - Forward to consumer contract for distribution

## Critical Files to Understand

### Contract Entry Points
- `src/forwarder/component.cairo:77-99`: Main verification logic
- `src/forwarder/signature.cairo:8-28`: Ethereum signature verification
- `src/types/leaf.cairo:19-29`: Leaf hashing algorithm

### Client Core Logic
- `client/src/components/EligibilityChecker.tsx:62-84`: Eligibility check
- `client/src/components/EligibilityChecker.tsx:87-125`: Proof generation
- `client/src/utils/leafHasher.ts:7-27`: Leaf hashing (must match Cairo)
- `client/src/utils/merkleTree.ts`: Tree construction and verification

### Configuration
- `client/.env`: Environment variables (APP_PRIVATE_KEY, VITE_CONTRACT_ADDRESS, etc.)
- `client/src/data/snapshot.json`: Eligible addresses (large file ~800+ entries)

## Known Issues

The current implementation has discrepancies from the specification:

1. **Snapshot structure**: Missing `index` field in entries
2. **Leaf hashing**: Missing `claim_contract` and `entrypoint` in hash inputs
3. **Signature flow**: Currently uses Starknet ECDSA with app private key, but should use Ethereum signatures with (v, r, s) for cross-chain verification

The Cairo contracts correctly implement the forwarder pattern with Ethereum signature verification, but the client needs updates to match.

## Environment Setup

Required environment variables in `client/.env`:
```bash
# Wallet providers
VITE_REOWN_PROJECT_ID=xxx           # WalletConnect project ID

# Contract config
VITE_CONTRACT_ADDRESS=0x...         # Deployed forwarder contract
VITE_CAMPAIGN_ID=CAMPAIGN_1         # Campaign identifier

# Starknet network
VITE_RPC_URL=https://...            # Starknet RPC endpoint
VITE_CHAIN_ID=0x534e5f4d41494e      # Starknet mainnet

# App signing key (KEEP SECRET!)
APP_PRIVATE_KEY=0x...               # For signing in scripts only
```

## Testing Strategy

Contract tests (`src/tests/test_contract.cairo`):
- Test Merkle proof verification
- Test signature verification
- Test double-claim prevention
- Test forwarder-consumer integration

Client flow test (`client/scripts/testClaimFlow.ts`):
- End-to-end claim simulation
- Verifies leaf hashing matches contract
- Tests proof generation

## Documentation

- `client/MERKLE_DROP_SETUP.md`: Complete setup guide
- `client/WALLET_SETUP.md`: Wallet integration guide
- `README.md`: Dojo starter template info (less relevant)
