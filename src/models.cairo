use starknet::ContractAddress;

// Enum for tracking claim status
#[derive(Serde, Drop, Copy, Introspect, PartialEq, Debug)]
pub enum ClaimStatus {
    Unclaimed,
    Claimed,
}

impl ClaimStatusIntoFelt252 of Into<ClaimStatus, felt252> {
    fn into(self: ClaimStatus) -> felt252 {
        match self {
            ClaimStatus::Unclaimed => 0,
            ClaimStatus::Claimed => 1,
        }
    }
}

// Campaign configuration model - stores settings for each campaign
#[derive(Drop, Serde)]
#[dojo::model]
pub struct Campaign {
    #[key]
    pub campaign_id: felt252,
    pub forwarder_address: ContractAddress,
    pub total_claims: u32,
    pub is_active: bool,
}

// Claim model - tracks individual claim status
#[derive(Drop, Serde)]
#[dojo::model]
pub struct Claim {
    #[key]
    pub campaign_id: felt252,
    #[key]
    pub leaf_hash: felt252,
    pub recipient: ContractAddress,
    pub status: ClaimStatus,
    pub claimed_at: u64,
}

// Balance model - tracks token/NFT balances for recipients
#[derive(Drop, Serde)]
#[dojo::model]
pub struct Balance {
    #[key]
    pub token_key: felt252,
    #[key]
    pub account: ContractAddress,
    pub amount: u128,
}

// LeafData struct - not a model, used for deserialization
#[derive(Drop, Copy, Clone, Serde, PartialEq, Introspect)]
pub struct LeafData {
    pub token_ids: Span<felt252>,
}

// LeafDataWithExtraData struct - not a model, used for deserialization
#[derive(Drop, Copy, Clone, Serde, PartialEq, Introspect)]
pub struct LeafDataWithExtraData {
    pub amount_A: u32,
    pub amount_B: u32,
    pub token_ids: Span<felt252>,
}

// Event for claim actions
#[derive(Copy, Drop, Serde)]
#[dojo::event]
pub struct ClaimProcessed {
    #[key]
    pub campaign_id: felt252,
    #[key]
    pub recipient: ContractAddress,
    pub leaf_hash: felt252,
    pub timestamp: u64,
}
