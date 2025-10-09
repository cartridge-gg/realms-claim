# Pistols Duel Integration - Questions & Clarifications Needed

## Current Implementation

The ClaimContract currently calls `claim_starter_pack()` on the Pistols Duel contract three times:

```cairo
// src/main.cairo:109-112
let pistols_duel = IPistolsDuelDispatcher { contract_address: PISTOLS_DUEL_ADDRESS() };
pistols_duel.claim_starter_pack();
pistols_duel.claim_starter_pack();
pistols_duel.claim_starter_pack();
```

**Contract Address:** `0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9`

## Questions from Discord

In the Discord conversation, you mentioned:

> "btw do you have the pistols erc20 contract? the current contract which gabe shared is a erc 721"
> "we might have to specify the token id to run a transfer_from"

This suggests there might be confusion about whether Pistols uses:
- **ERC721** (NFTs with specific token IDs)
- **ERC20** (fungible tokens with amounts)
- **Custom claim function** (current implementation)

## Three Possible Approaches

### Option 1: Keep `claim_starter_pack()` (Current)

**Pros:**
- Simplest implementation
- No need to pre-acquire tokens
- Direct claim mechanism

**Cons:**
- Requires authorization - does the claim contract have permission?
- Unknown behavior - what exactly does this function do?
- May have limits on number of calls

**Action needed:**
1. Contact Pistols team (Gabe?) to verify:
   - Can our claim contract call `claim_starter_pack()`?
   - Is there a whitelist/permission system?
   - What does the function actually mint/give?
   - Are there any limits?

### Option 2: Use ERC20 `transfer_from()`

If Pistols uses an ERC20 token:

```cairo
let pistols_token = IERC20TokenDispatcher { contract_address: PISTOLS_DUEL_ADDRESS() };
pistols_token.transfer_from(contract_address, recipient, 3);
```

**Requires:**
- Claim contract holds Pistols ERC20 tokens
- No token ID needed (fungible)

### Option 3: Use ERC721 `transferFrom()` with Token IDs

If Pistols uses ERC721 NFTs:

```cairo
// Need to specify which token IDs to transfer
let pistols_nft = IERC721Dispatcher { contract_address: PISTOLS_DUEL_ADDRESS() };
pistols_nft.transferFrom(contract_address, recipient, token_id_1);
pistols_nft.transferFrom(contract_address, recipient, token_id_2);
pistols_nft.transferFrom(contract_address, recipient, token_id_3);
```

**Requires:**
- Claim contract holds specific Pistols NFTs (token IDs)
- Need to track which token IDs are available
- More complex implementation (manage inventory)

## How to Determine the Correct Approach

### 1. Check Pistols Contract Type

```bash
PISTOLS="0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9"

# Check if it's ERC20 (has balanceOf, transfer, allowance)
starkli call $PISTOLS balanceOf 0x123 --rpc $RPC_URL

# Check if it's ERC721 (has ownerOf, tokenURI)
starkli call $PISTOLS ownerOf 1 --rpc $RPC_URL

# Check if claim_starter_pack exists
starkli call $PISTOLS claim_starter_pack --rpc $RPC_URL
```

### 2. Check Voyager/Starkscan

Visit:
https://voyager.online/contract/0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9

Look for:
- Interface implementation (ERC20, ERC721, etc.)
- `claim_starter_pack` function signature
- Recent transactions to understand usage

### 3. Review Pistols Documentation

Check:
- Official Pistols documentation
- GitHub repository
- Discord/community channels

## Recommendation

**Immediate action:** Contact the Pistols team to clarify:

1. **What is the Pistols contract type?**
   - ERC20, ERC721, or custom?

2. **What is the intended distribution method?**
   - Should we call `claim_starter_pack()`?
   - Or should we pre-acquire and transfer tokens?

3. **Authorization requirements:**
   - Does our contract need to be whitelisted?
   - Are there any permissions needed?

4. **What exactly is a "starter pack"?**
   - Is it a single NFT?
   - Is it multiple items?
   - Is it a token amount?

## Contact

**People to ask:**
- Gabe (mentioned in your Discord message)
- Pistols team on Discord/Telegram
- Check #pistols channel if available

## Temporary Solution

While waiting for clarification, you can:

1. **Deploy with current implementation** (using `claim_starter_pack`)
2. **Test with 1 claim** on testnet/mainnet
3. **Monitor the transaction** to see what actually happens
4. **Use the upgrade capability** to fix if needed (contract is upgradeable)

## Interface Updates Needed

Depending on the answer, you may need to update:

```cairo
// src/constants/interface.cairo

// If ERC721:
#[starknet::interface]
pub trait IERC721<T> {
    fn transferFrom(ref self: T, from: ContractAddress, to: ContractAddress, token_id: u256);
    fn ownerOf(self: @T, token_id: u256) -> ContractAddress;
}

// If keeping current:
#[starknet::interface]
pub trait IPistolsDuel<T> {
    fn claim_starter_pack(ref self: T);
    // Maybe needs parameters? Check actual signature
}
```

## Decision Tree

```
Is Pistols an ERC20?
├─ YES → Use IERC20TokenDispatcher.transfer_from(amount: 3)
└─ NO → Is it ERC721?
    ├─ YES → Use ERC721.transferFrom with specific token_ids
    └─ NO → Is it a custom contract?
        └─ Use claim_starter_pack() BUT verify:
            ├─ Authorization required?
            ├─ What does it actually give?
            └─ Any limits on calls?
```

## Next Steps

1. ✅ Document the issue (this file)
2. ⏳ Contact Pistols team for clarification
3. ⏳ Test current implementation with 1 claim
4. ⏳ Update interface based on findings
5. ⏳ Redeploy if needed (using upgrade capability)
