#[cfg(test)]
mod tests {
    use dojo::model::{ModelStorage, ModelStorageTest};
    use dojo::world::{WorldStorageTrait, world};
    use dojo_cairo_test::{
        ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
        spawn_test_world,
    };
    use dojo_starter::models::{
        ClaimStatus, AppPublicKey, MerkleRoot, ConsumedClaim, LeafData, m_ClaimStatus,
        m_AppPublicKey, m_MerkleRoot, m_ConsumedClaim,
    };
    use dojo_starter::systems::actions::{IActionsDispatcher, IActionsDispatcherTrait, actions};
    use starknet::{ContractAddress, testing::set_caller_address};

    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "dojo_starter",
            resources: [
                TestResource::Model(m_ClaimStatus::TEST_CLASS_HASH),
                TestResource::Model(m_AppPublicKey::TEST_CLASS_HASH),
                TestResource::Model(m_MerkleRoot::TEST_CLASS_HASH),
                TestResource::Model(m_ConsumedClaim::TEST_CLASS_HASH),
                TestResource::Event(actions::e_Claimed::TEST_CLASS_HASH),
                TestResource::Event(actions::e_AppPublicKeySet::TEST_CLASS_HASH),
                TestResource::Event(actions::e_DropInitialized::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
            ]
                .span(),
        };

        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"dojo_starter", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"dojo_starter")].span())
        ]
            .span()
    }

    #[test]
    fn test_claim_status_model() {
        // Initialize test environment
        let caller: ContractAddress = 0.try_into().unwrap();
        let ndef = namespace_def();

        // Register the resources.
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());

        // Ensures permissions and initializations are synced.
        world.sync_perms_and_inits(contract_defs());

        // Test initial claim status
        let mut claim_status: ClaimStatus = world.read_model(caller);
        assert(claim_status.has_claimed == false, 'initial claim status wrong');
        assert(claim_status.claim_count == 0, 'initial claim count wrong');

        // Test write_model_test
        claim_status.has_claimed = true;
        claim_status.claim_count = 1;

        world.write_model_test(@claim_status);

        let claim_status: ClaimStatus = world.read_model(caller);
        assert(claim_status.has_claimed == true, 'write model failed');
        assert(claim_status.claim_count == 1, 'claim count write failed');

        // Test model deletion
        world.erase_model(@claim_status);
        let claim_status: ClaimStatus = world.read_model(caller);
        assert(claim_status.has_claimed == false, 'erase_model failed');
    }

    #[test]
    #[available_gas(30000000)]
    fn test_set_app_public_key() {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        const APP_ID: felt252 = 'REALMS_CLAIM_APP';

        // Test initial app public key (should be 0)
        let initial_key: AppPublicKey = world.read_model(APP_ID);
        assert(initial_key.public_key == 0, 'initial key should be 0');

        // Set the app's public key
        let test_public_key: felt252 = 0x1234567890abcdef;
        actions_system.set_app_public_key(test_public_key);

        // Verify the public key was stored
        let stored_key: AppPublicKey = world.read_model(APP_ID);
        assert(stored_key.public_key == test_public_key, 'public key not stored');
    }

    #[test]
    #[available_gas(30000000)]
    fn test_initialize_drop() {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        let campaign_id: felt252 = 'CAMPAIGN_1';
        let merkle_root: felt252 = 0x1234567890abcdef;

        // Initialize a drop
        actions_system.initialize_drop(campaign_id, merkle_root);

        // Verify the merkle root was stored
        let stored_root = actions_system.get_merkle_root(campaign_id);
        assert(stored_root == merkle_root, 'merkle root not stored');
    }

    #[test]
    #[available_gas(30000000)]
    fn test_merkle_claim_simple() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Setup: set app public key
        let public_key: felt252 =
            0x49ee3eba8c1600700ee1b87eb599f16716b0b1022947733551fde4050ca6804;
        actions_system.set_app_public_key(public_key);

        // Initialize a drop with a simple merkle root
        let campaign_id: felt252 = 'CAMPAIGN_1';
        // This is a placeholder - in real tests, compute from actual merkle tree
        let merkle_root: felt252 = 0x1234;
        actions_system.initialize_drop(campaign_id, merkle_root);

        // Create leaf data
        let _claim_data = array![100, 200]; // Example: claim amounts
        // Note: This test demonstrates the setup but doesn't execute the claim
        // In production, generate proper signatures matching the leaf hash
        // and use: actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
    }

    #[test]
    #[available_gas(30000000)]
    #[should_panic(expected: ('Campaign not initialized',))]
    fn test_claim_without_initialized_campaign() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Set the caller address for the test
        set_caller_address(caller);

        // Try to claim without initializing the campaign
        let campaign_id: felt252 = 'CAMPAIGN_1';
        let claim_data = array![100];
        let leaf_data = LeafData { address: caller, index: 0, claim_data: claim_data.span() };
        let merkle_proof: Array<felt252> = array![];
        let signature_r: felt252 = 0x1;
        let signature_s: felt252 = 0x2;

        actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
    }

    #[test]
    #[available_gas(30000000)]
    fn test_is_claimed() {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        let leaf_hash: felt252 = 0x1234;

        // Check unclaimed leaf
        let is_claimed = actions_system.is_claimed(leaf_hash);
        assert(!is_claimed, 'should not be claimed');
    }

    #[test]
    #[available_gas(30000000)]
    #[should_panic(expected: ('Caller address mismatch',))]
    fn test_claim_address_mismatch() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let different_address: ContractAddress = 0x456.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Set caller to one address
        set_caller_address(caller);

        // Setup campaign
        let campaign_id: felt252 = 'CAMPAIGN_1';
        let merkle_root: felt252 = 0x1234;
        actions_system.initialize_drop(campaign_id, merkle_root);

        // Try to claim with different address in leaf_data
        let claim_data = array![100];
        let leaf_data = LeafData {
            address: different_address, // Different from caller
            index: 0,
            claim_data: claim_data.span(),
        };
        let merkle_proof: Array<felt252> = array![];
        let signature_r: felt252 = 0x1;
        let signature_s: felt252 = 0x2;

        actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
    }

    #[test]
    #[available_gas(30000000)]
    #[should_panic(expected: ('Campaign not active',))]
    fn test_claim_inactive_campaign() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Set the caller address
        set_caller_address(caller);

        // Manually create an inactive campaign
        let campaign_id: felt252 = 'CAMPAIGN_1';
        let inactive_root = MerkleRoot { campaign_id, root: 0x1234, is_active: false };
        world.write_model(@inactive_root);

        // Try to claim
        let claim_data = array![100];
        let leaf_data = LeafData { address: caller, index: 0, claim_data: claim_data.span() };
        let merkle_proof: Array<felt252> = array![];
        let signature_r: felt252 = 0x1;
        let signature_s: felt252 = 0x2;

        actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
    }

    #[test]
    #[available_gas(30000000)]
    #[should_panic(expected: ('Already claimed',))]
    fn test_double_claim_prevention() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Set the caller address
        set_caller_address(caller);

        // Setup campaign
        let campaign_id: felt252 = 'CAMPAIGN_1';
        let merkle_root: felt252 = 0x1234;
        actions_system.initialize_drop(campaign_id, merkle_root);

        // Manually mark a leaf as consumed
        let claim_data = array![100];
        let leaf_data = LeafData { address: caller, index: 0, claim_data: claim_data.span() };

        // Compute the leaf hash (simplified - would need actual hash_leaf implementation)
        let leaf_hash: felt252 = 0x5678;

        let consumed_claim = ConsumedClaim {
            leaf_hash, is_consumed: true, claimer: caller, timestamp: 123456,
        };
        world.write_model(@consumed_claim);

        // Try to claim again - should fail
        let merkle_proof: Array<felt252> = array![];
        let signature_r: felt252 = 0x1;
        let signature_s: felt252 = 0x2;

        // This should panic with "Already claimed"
        actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
    }

    #[test]
    #[available_gas(30000000)]
    #[should_panic(expected: ('App public key not set',))]
    fn test_claim_without_public_key() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Set the caller address
        set_caller_address(caller);

        // Setup campaign without setting public key
        let campaign_id: felt252 = 'CAMPAIGN_1';
        let merkle_root: felt252 = 0x1234;
        actions_system.initialize_drop(campaign_id, merkle_root);

        // Try to claim - should fail because no public key is set
        let claim_data = array![100];
        let leaf_data = LeafData { address: caller, index: 0, claim_data: claim_data.span() };
        let merkle_proof: Array<felt252> = array![];
        let signature_r: felt252 = 0x1;
        let signature_s: felt252 = 0x2;

        actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
    }

    #[test]
    #[available_gas(30000000)]
    fn test_multiple_campaigns() {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        // Initialize multiple campaigns
        let campaign_1: felt252 = 'CAMPAIGN_1';
        let campaign_2: felt252 = 'CAMPAIGN_2';
        let root_1: felt252 = 0x1111;
        let root_2: felt252 = 0x2222;

        actions_system.initialize_drop(campaign_1, root_1);
        actions_system.initialize_drop(campaign_2, root_2);

        // Verify both campaigns exist
        let stored_root_1 = actions_system.get_merkle_root(campaign_1);
        let stored_root_2 = actions_system.get_merkle_root(campaign_2);

        assert(stored_root_1 == root_1, 'campaign 1 root mismatch');
        assert(stored_root_2 == root_2, 'campaign 2 root mismatch');
    }

    #[test]
    #[available_gas(30000000)]
    fn test_claim_status_tracking() {
        let caller: ContractAddress = 0x123.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        // Test initial claim status
        let initial_status: ClaimStatus = world.read_model(caller);
        assert(initial_status.has_claimed == false, 'initial has_claimed wrong');
        assert(initial_status.claim_count == 0, 'initial count wrong');
        assert(initial_status.last_claim_time == 0, 'initial timestamp wrong');

        // Simulate a claim by updating status manually
        let updated_status = ClaimStatus {
            player: caller, has_claimed: true, claim_count: 1, last_claim_time: 123456,
        };
        world.write_model(@updated_status);

        // Verify the status was updated
        let final_status: ClaimStatus = world.read_model(caller);
        assert(final_status.has_claimed == true, 'has_claimed not updated');
        assert(final_status.claim_count == 1, 'count not updated');
        assert(final_status.last_claim_time == 123456, 'timestamp not updated');
    }

    #[test]
    #[available_gas(30000000)]
    fn test_campaign_overwrite_vulnerability() {
        // This test demonstrates the security vulnerability where anyone can overwrite a campaign
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        let campaign_id: felt252 = 'CAMPAIGN_1';

        // Initialize with root_1
        let root_1: felt252 = 0x1111;
        actions_system.initialize_drop(campaign_id, root_1);

        let stored_root_1 = actions_system.get_merkle_root(campaign_id);
        assert(stored_root_1 == root_1, 'root_1 not stored');

        // ⚠️ VULNERABILITY: Anyone can overwrite the root!
        let root_2: felt252 = 0x2222;
        actions_system.initialize_drop(campaign_id, root_2);

        let stored_root_2 = actions_system.get_merkle_root(campaign_id);
        assert(stored_root_2 == root_2, 'root was not overwritten');

        // This proves the vulnerability exists - campaigns can be overwritten!
    }
}
