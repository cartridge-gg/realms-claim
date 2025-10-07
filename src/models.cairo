use starknet::ContractAddress;

// Tracks claim status for each player
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct ClaimStatus {
    #[key]
    pub player: ContractAddress,
    pub has_claimed: bool,
    pub claim_count: u32,
    pub last_claim_time: u64,
}

// App-level public key for signature verification
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct AppPublicKey {
    #[key]
    pub app_id: felt252,
    pub public_key: felt252,
}

// Merkle root storage per campaign
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct MerkleRoot {
    #[key]
    pub campaign_id: felt252,
    pub root: felt252,
    pub is_active: bool,
}

// Track consumed claims to prevent double-claiming
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct ConsumedClaim {
    #[key]
    pub leaf_hash: felt252,
    pub is_consumed: bool,
    pub claimer: ContractAddress,
    pub timestamp: u64,
}

// Leaf data structure for claims
#[derive(Drop, Serde, Debug)]
pub struct LeafData {
    pub address: ContractAddress,
    pub index: u32,
    pub claim_data: Span<felt252>,
}
