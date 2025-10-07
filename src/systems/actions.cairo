use dojo_starter::models::{AppPublicKey, LeafData, MerkleRoot, ConsumedClaim, ClaimStatus};

// define the interface
#[starknet::interface]
pub trait IActions<T> {
    fn set_app_public_key(ref self: T, public_key: felt252);
    fn initialize_drop(ref self: T, campaign_id: felt252, merkle_root: felt252);
    fn claim(
        ref self: T,
        campaign_id: felt252,
        leaf_data: LeafData,
        merkle_proof: Array<felt252>,
        signature_r: felt252,
        signature_s: felt252,
    );
    fn is_claimed(self: @T, leaf_hash: felt252) -> bool;
    fn get_merkle_root(self: @T, campaign_id: felt252) -> felt252;
}

// dojo decorator
#[dojo::contract]
pub mod actions {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use super::{IActions, AppPublicKey, LeafData, MerkleRoot, ConsumedClaim, ClaimStatus};
    use core::ecdsa::check_ecdsa_signature;
    use core::poseidon::poseidon_hash_span;
    use core::pedersen::pedersen;

    const APP_ID: felt252 = 'REALMS_CLAIM_APP';

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct Claimed {
        #[key]
        pub player: ContractAddress,
        pub campaign_id: felt252,
        pub leaf_hash: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct AppPublicKeySet {
        #[key]
        pub setter: ContractAddress,
        pub public_key: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DropInitialized {
        #[key]
        pub campaign_id: felt252,
        pub merkle_root: felt252,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn set_app_public_key(ref self: ContractState, public_key: felt252) {
            // Get the default world.
            let mut world = self.world_default();

            // Store the app's public key.
            let app_key = AppPublicKey { app_id: APP_ID, public_key };
            world.write_model(@app_key);

            // Emit event for public key registration.
            world.emit_event(@AppPublicKeySet { setter: get_caller_address(), public_key });
        }

        fn initialize_drop(ref self: ContractState, campaign_id: felt252, merkle_root: felt252) {
            // Get the default world.
            let mut world = self.world_default();

            // Store the merkle root for the campaign
            let root_data = MerkleRoot { campaign_id, root: merkle_root, is_active: true };
            world.write_model(@root_data);

            // Emit event for drop initialization
            world.emit_event(@DropInitialized { campaign_id, merkle_root });
        }

        fn claim(
            ref self: ContractState,
            campaign_id: felt252,
            leaf_data: LeafData,
            merkle_proof: Array<felt252>,
            signature_r: felt252,
            signature_s: felt252,
        ) {
            // Get the default world.
            let mut world = self.world_default();

            // Get the address of the current caller.
            let player = get_caller_address();

            // Verify that the caller matches the leaf data address
            assert(player == leaf_data.address, 'Caller address mismatch');

            // Read the stored merkle root for the campaign
            let root_data: MerkleRoot = world.read_model(campaign_id);
            assert(root_data.is_active, 'Campaign not active');
            assert(root_data.root != 0, 'Campaign not initialized');

            // Hash the leaf data
            let leaf_hash = InternalImpl::hash_leaf(@self, @leaf_data);

            // Check if this leaf has already been claimed
            let consumed: ConsumedClaim = world.read_model(leaf_hash);
            assert(!consumed.is_consumed, 'Already claimed');

            // Verify the merkle proof
            let is_valid_proof = InternalImpl::verify_merkle_proof(
                @self, leaf_hash, merkle_proof.span(), root_data.root,
            );
            assert(is_valid_proof, 'Invalid merkle proof');

            // Read the stored app public key and verify signature
            let app_key: AppPublicKey = world.read_model(APP_ID);
            assert(app_key.public_key != 0, 'App public key not set');

            // Create message hash from leaf hash for signature verification
            let is_valid_sig = check_ecdsa_signature(
                leaf_hash, app_key.public_key, signature_r, signature_s,
            );
            assert(is_valid_sig, 'Invalid signature');

            // Mark the leaf as consumed
            let timestamp = get_block_timestamp();
            let consumed_claim = ConsumedClaim {
                leaf_hash, is_consumed: true, claimer: player, timestamp,
            };
            world.write_model(@consumed_claim);

            // Update claim status
            let mut status: ClaimStatus = world.read_model(player);
            status.has_claimed = true;
            status.claim_count += 1;
            status.last_claim_time = timestamp;
            world.write_model(@status);

            // Emit the claimed event
            world.emit_event(@Claimed { player, campaign_id, leaf_hash });
        }

        fn is_claimed(self: @ContractState, leaf_hash: felt252) -> bool {
            let world = self.world_default();
            let consumed: ConsumedClaim = world.read_model(leaf_hash);
            consumed.is_consumed
        }

        fn get_merkle_root(self: @ContractState, campaign_id: felt252) -> felt252 {
            let world = self.world_default();
            let root_data: MerkleRoot = world.read_model(campaign_id);
            root_data.root
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Use the default namespace "dojo_starter". This function is handy since the ByteArray
        /// can't be const.
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"dojo_starter")
        }

        /// Hash leaf data using Poseidon hash
        /// Matches the JavaScript implementation for consistency
        fn hash_leaf(self: @ContractState, leaf_data: @LeafData) -> felt252 {
            let mut elements: Array<felt252> = array![];

            // Add address
            elements.append((*leaf_data.address).into());

            // Add index
            elements.append((*leaf_data.index).into());

            // Add claim_data length
            elements.append((*leaf_data.claim_data).len().into());

            // Add claim_data elements
            let mut i = 0;
            loop {
                if i >= (*leaf_data.claim_data).len() {
                    break;
                }
                elements.append(*(*leaf_data.claim_data).at(i));
                i += 1;
            };

            // Hash using Poseidon and finalize with Pedersen
            let poseidon_hash = poseidon_hash_span(elements.span());
            pedersen(poseidon_hash, 0)
        }

        /// Verify merkle proof
        /// Returns true if the proof is valid for the given leaf and root
        fn verify_merkle_proof(
            self: @ContractState, leaf: felt252, proof: Span<felt252>, root: felt252,
        ) -> bool {
            let mut computed_hash = leaf;
            let mut i = 0;

            loop {
                if i >= proof.len() {
                    break;
                }

                let proof_element = *proof.at(i);

                // Hash in sorted order by comparing as u256
                let hash_a: u256 = computed_hash.into();
                let hash_b: u256 = proof_element.into();

                computed_hash =
                    if hash_a < hash_b {
                        pedersen(computed_hash, proof_element)
                    } else {
                        pedersen(proof_element, computed_hash)
                    };

                i += 1;
            };

            computed_hash == root
        }
    }
}
