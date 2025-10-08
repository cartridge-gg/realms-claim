use starknet::ContractAddress;
use realms_claim::models::{LeafData, LeafDataWithExtraData};

// Existing forwarder contract address
const FORWARDER_ADDRESS: felt252 = 0x50a858cf7abee543a5709f789a0b01482bfe940d65bb12aa13fabf65e048a26;

// Define the interface
#[starknet::interface]
pub trait IClaimActions<T> {
    fn initialize(ref self: T, campaign_id: felt252);
    fn get_balance(self: @T, token_key: felt252, account: ContractAddress) -> u128;
    fn is_claimed(self: @T, campaign_id: felt252, leaf_hash: felt252) -> bool;
    fn get_campaign_info(self: @T, campaign_id: felt252) -> (ContractAddress, u32, bool);
    fn claim_from_forwarder(
        ref self: T, campaign_id: felt252, recipient: ContractAddress, leaf_data: Span<felt252>
    );
    fn claim_from_forwarder_with_extra_data(
        ref self: T, campaign_id: felt252, recipient: ContractAddress, leaf_data: Span<felt252>
    );
}

// Dojo contract
#[dojo::contract]
pub mod claim_actions {
    use super::{IClaimActions, LeafData, LeafDataWithExtraData, FORWARDER_ADDRESS};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use realms_claim::models::{Campaign, Balance, Claim, ClaimStatus, ClaimProcessed};
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::event::EventStorage;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct CampaignInitialized {
        #[key]
        pub campaign_id: felt252,
        pub forwarder_address: ContractAddress,
    }

    #[abi(embed_v0)]
    impl ClaimActionsImpl of IClaimActions<ContractState> {
        fn initialize(ref self: ContractState, campaign_id: felt252) {
            // Get the world with proper namespace
            let mut world = self.world(@"realms_claim");

            // Convert forwarder address from felt252 to ContractAddress
            let forwarder_address: ContractAddress = FORWARDER_ADDRESS.try_into().unwrap();

            // Create new Campaign model
            let campaign = Campaign {
                campaign_id, forwarder_address, total_claims: 0, is_active: true,
            };

            // Write to world state
            world.write_model(@campaign);

            // Emit initialization event
            world.emit_event(@CampaignInitialized { campaign_id, forwarder_address });
        }

        fn get_balance(self: @ContractState, token_key: felt252, account: ContractAddress) -> u128 {
            // Get the world with proper namespace
            let world = self.world(@"realms_claim");

            // Read balance model
            let balance: Balance = world.read_model((token_key, account));
            balance.amount
        }

        fn is_claimed(self: @ContractState, campaign_id: felt252, leaf_hash: felt252) -> bool {
            // Get the world with proper namespace
            let world = self.world(@"realms_claim");

            // Read claim status
            let claim: Claim = world.read_model((campaign_id, leaf_hash));
            claim.status == ClaimStatus::Claimed
        }

        fn get_campaign_info(
            self: @ContractState, campaign_id: felt252
        ) -> (ContractAddress, u32, bool) {
            // Get the world with proper namespace
            let world = self.world(@"realms_claim");

            // Read campaign model
            let campaign: Campaign = world.read_model(campaign_id);
            (campaign.forwarder_address, campaign.total_claims, campaign.is_active)
        }

        fn claim_from_forwarder(
            ref self: ContractState,
            campaign_id: felt252,
            recipient: ContractAddress,
            leaf_data: Span<felt252>
        ) {
            // Get the world with proper namespace
            let mut world = self.world(@"realms_claim");

            // MUST check caller is forwarder
            self.assert_caller_is_forwarder(campaign_id);

            // Deserialize leaf_data
            let mut leaf_data_copy = leaf_data;
            let data = Serde::<LeafData>::deserialize(ref leaf_data_copy).unwrap();

            // Calculate leaf hash (simplified - in production use proper hashing)
            let leaf_hash = self.calculate_leaf_hash(leaf_data);

            // Check if already claimed
            let claim: Claim = world.read_model((campaign_id, leaf_hash));
            assert(claim.status == ClaimStatus::Unclaimed, "Already claimed");

            // Process the claim
            let amount: u128 = data.token_ids.len().into();

            // Update balance
            let mut balance: Balance = world.read_model(('TOKEN_A', recipient));
            balance.amount = balance.amount + amount;
            world.write_model(@balance);

            // Mark as claimed
            let claim = Claim {
                campaign_id,
                leaf_hash,
                recipient,
                status: ClaimStatus::Claimed,
                claimed_at: get_block_timestamp(),
            };
            world.write_model(@claim);

            // Update campaign stats
            let mut campaign: Campaign = world.read_model(campaign_id);
            campaign.total_claims = campaign.total_claims + 1;
            world.write_model(@campaign);

            // Emit event
            world
                .emit_event(
                    @ClaimProcessed {
                        campaign_id, recipient, leaf_hash, timestamp: get_block_timestamp()
                    }
                );
        }

        fn claim_from_forwarder_with_extra_data(
            ref self: ContractState,
            campaign_id: felt252,
            recipient: ContractAddress,
            leaf_data: Span<felt252>
        ) {
            // Get the world with proper namespace
            let mut world = self.world(@"realms_claim");

            // MUST check caller is forwarder
            self.assert_caller_is_forwarder(campaign_id);

            // Deserialize leaf_data
            let mut leaf_data_copy = leaf_data;
            let data = Serde::<LeafDataWithExtraData>::deserialize(ref leaf_data_copy).unwrap();

            // Calculate leaf hash
            let leaf_hash = self.calculate_leaf_hash(leaf_data);

            // Check if already claimed
            let claim: Claim = world.read_model((campaign_id, leaf_hash));
            assert(claim.status == ClaimStatus::Unclaimed, "Already claimed");

            // Update TOKEN_A balance
            let mut balance_a: Balance = world.read_model(('TOKEN_A', recipient));
            balance_a.amount = balance_a.amount + data.amount_A.into();
            world.write_model(@balance_a);

            // Update TOKEN_B balance
            let mut balance_b: Balance = world.read_model(('TOKEN_B', recipient));
            balance_b.amount = balance_b.amount + data.amount_B.into();
            world.write_model(@balance_b);

            // Mark as claimed
            let claim = Claim {
                campaign_id,
                leaf_hash,
                recipient,
                status: ClaimStatus::Claimed,
                claimed_at: get_block_timestamp(),
            };
            world.write_model(@claim);

            // Update campaign stats
            let mut campaign: Campaign = world.read_model(campaign_id);
            campaign.total_claims = campaign.total_claims + 1;
            world.write_model(@campaign);

            // Emit event
            world
                .emit_event(
                    @ClaimProcessed {
                        campaign_id, recipient, leaf_hash, timestamp: get_block_timestamp()
                    }
                );
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"realms_claim")
        }

        fn assert_caller_is_forwarder(self: @ContractState, campaign_id: felt252) {
            let world = self.world(@"realms_claim");
            let caller = get_caller_address();

            // Read the campaign to get forwarder address
            let campaign: Campaign = world.read_model(campaign_id);
            assert(caller == campaign.forwarder_address, "Caller is not forwarder");
            assert(campaign.is_active, "Campaign is not active");
        }

        fn calculate_leaf_hash(self: @ContractState, leaf_data: Span<felt252>) -> felt252 {
            // Simplified hash calculation - in production use proper Poseidon/Pedersen
            // This should match the client-side hashing logic
            let mut hash: felt252 = 0;
            let mut i = 0;
            loop {
                if i >= leaf_data.len() {
                    break;
                }
                hash = hash + *leaf_data.at(i);
                i += 1;
            };
            hash
        }
    }
}
