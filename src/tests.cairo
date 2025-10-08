#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const};
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{spawn_test_world, NamespaceDef, TestResource, ContractDefTrait};

    use realms_claim::models::{Campaign, Claim, Balance, ClaimStatus, m_Campaign, m_Claim, m_Balance};
    use realms_claim::systems::claim::{
        claim_actions, IClaimActionsDispatcher, IClaimActionsDispatcherTrait, FORWARDER_ADDRESS
    };

    fn CAMPAIGN_ID() -> felt252 {
        'CAMPAIGN_1'
    }

    fn setup() -> (WorldStorage, IClaimActionsDispatcher) {
        // Define namespace
        let namespace_def = NamespaceDef {
            namespace: "realms_claim", resources: [
                TestResource::Model(m_Campaign::TEST_CLASS_HASH),
                TestResource::Model(m_Claim::TEST_CLASS_HASH),
                TestResource::Model(m_Balance::TEST_CLASS_HASH),
                TestResource::Contract(
                    ContractDefTrait::new(
                        @"realms_claim", @"claim_actions"
                    )
                        .with_writer_of([dojo::utils::bytearray_hash(@"realms_claim")].span())
                ),
            ].span()
        };

        // Spawn test world
        let mut world = spawn_test_world([namespace_def].span());

        // Deploy claim contract
        let claim_contract_address = world
            .dns(@"claim_actions")
            .expect('claim contract not found')
            .0;
        let claim_dispatcher = IClaimActionsDispatcher { contract_address: claim_contract_address };

        (world, claim_dispatcher)
    }

    #[test]
    fn test_initialize_campaign() {
        let (world, claim_dispatcher) = setup();

        claim_dispatcher.initialize(CAMPAIGN_ID());

        // Verify campaign was created
        let campaign: Campaign = world.read_model(CAMPAIGN_ID());
        assert(campaign.campaign_id == CAMPAIGN_ID(), 'wrong campaign_id');

        // Check forwarder address matches the constant
        let expected_forwarder: ContractAddress = FORWARDER_ADDRESS.try_into().unwrap();
        assert(campaign.forwarder_address == expected_forwarder, 'wrong forwarder');
        assert(campaign.total_claims == 0, 'wrong total_claims');
        assert(campaign.is_active, 'campaign should be active');
    }

    #[test]
    fn test_get_balance() {
        let (_, claim_dispatcher) = setup();

        let account = contract_address_const::<0x456>();
        let balance = claim_dispatcher.get_balance('TOKEN_A', account);
        assert(balance == 0, 'initial balance should be 0');
    }

    #[test]
    fn test_is_claimed() {
        let (_, claim_dispatcher) = setup();

        let leaf_hash = 0x789;
        let is_claimed = claim_dispatcher.is_claimed(CAMPAIGN_ID(), leaf_hash);
        assert(!is_claimed, 'should not be claimed');
    }

    #[test]
    fn test_get_campaign_info() {
        let (_, claim_dispatcher) = setup();

        claim_dispatcher.initialize(CAMPAIGN_ID());

        let (forwarder, total_claims, is_active) = claim_dispatcher.get_campaign_info(CAMPAIGN_ID());

        let expected_forwarder: ContractAddress = FORWARDER_ADDRESS.try_into().unwrap();
        assert(forwarder == expected_forwarder, 'wrong forwarder address');
        assert(total_claims == 0, 'should have 0 claims');
        assert(is_active, 'campaign should be active');
    }

    #[test]
    #[should_panic(expected: ('Already claimed',))]
    fn test_double_claim_prevention() {
        let (mut world, claim_dispatcher, _) = setup();

        let recipient = contract_address_const::<0xabc>();
        let leaf_hash = 0xdef;

        // Mark as claimed
        let claim = Claim {
            campaign_id: CAMPAIGN_ID(),
            leaf_hash,
            recipient,
            status: ClaimStatus::Claimed,
            claimed_at: 1000,
        };
        world.write_model(@claim);

        // Try to claim again - should panic
        let leaf_data: Array<felt252> = array![1, 2, 3];
        claim_dispatcher.claim_from_forwarder(CAMPAIGN_ID(), recipient, leaf_data.span());
    }

    #[test]
    fn test_campaign_stats_update() {
        let (mut world, _) = setup();

        // Create initial campaign
        let forwarder: ContractAddress = FORWARDER_ADDRESS.try_into().unwrap();
        let campaign = Campaign {
            campaign_id: CAMPAIGN_ID(),
            forwarder_address: forwarder,
            total_claims: 0,
            is_active: true,
        };
        world.write_model(@campaign);

        // Read and verify
        let campaign: Campaign = world.read_model(CAMPAIGN_ID());
        assert(campaign.total_claims == 0, 'wrong initial claims');

        // Update total claims
        let mut campaign = campaign;
        campaign.total_claims = 1;
        world.write_model(@campaign);

        // Verify update
        let campaign: Campaign = world.read_model(CAMPAIGN_ID());
        assert(campaign.total_claims == 1, 'wrong updated claims');
    }
}
