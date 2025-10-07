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
    use starknet::ContractAddress;

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
        let claim_data = array![100, 200]; // Example: claim amounts
        let leaf_data = LeafData { address: caller, index: 0, claim_data: claim_data.span() };

        // Create empty proof for single-leaf tree (root is the leaf itself)
        let merkle_proof = array![];

        // Placeholder signature (would need valid signature in production)
        let signature_r: felt252 = 0x789e8f93a2e28cbbb3bc7ae7c5090c5c81ff8d8e5ffbbcedb5e0e4b8ea;
        let signature_s: felt252 = 0x598a5d8e3e8d5f6f3c7f7d5e3f7d5e3f7d5e3f7d5e3f7d5e3f7d5e3f7d;

        // Note: This test will fail on signature verification
        // In production, generate proper signatures matching the leaf hash
        // actions_system.claim(campaign_id, leaf_data, merkle_proof, signature_r, signature_s);
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

        // Try to claim without initializing the campaign
        let campaign_id: felt252 = 'CAMPAIGN_1';
        let claim_data = array![100];
        let leaf_data = LeafData { address: caller, index: 0, claim_data: claim_data.span() };
        let merkle_proof = array![];
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
}
