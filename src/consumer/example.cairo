use starknet::ContractAddress;

#[starknet::interface]
pub trait IClaim<T> {
    fn initialize(ref self: T, forwarder_address: ContractAddress);
    fn get_balance(self: @T, key: felt252, address: ContractAddress) -> u32;
    fn claim_from_forwarder(ref self: T, recipient: ContractAddress, leaf_data: Span<felt252>);
    fn claim_from_forwarder_with_extra_data(
        ref self: T, recipient: ContractAddress, leaf_data: Span<felt252>,
    );
}

#[derive(Drop, Copy, Clone, Serde, PartialEq)]
pub struct LeafData {
    pub token_ids: Span<felt252>,
}

#[derive(Drop, Copy, Clone, Serde, PartialEq)]
pub struct LeafDataWithExtraData {
    pub amount_A: u32,
    pub amount_B: u32,
    pub token_ids: Span<felt252>,
}

#[starknet::contract]
mod ClaimContract {
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use super::*;

    #[storage]
    struct Storage {
        forwarder_address: ContractAddress,
        balance: Map<(felt252, ContractAddress), u32>,
    }

    // #[constructor]
    // fn constructor(ref self: ContractState, forwarder_address: ContractAddress) {
    //     self.forwarder_address.write(forwarder_address);
    // }

    #[abi(embed_v0)]
    impl ClaimImpl of IClaim<ContractState> {
        fn initialize(ref self: ContractState, forwarder_address: ContractAddress) {
            self.forwarder_address.write(forwarder_address);
        }

        fn get_balance(self: @ContractState, key: felt252, address: ContractAddress) -> u32 {
            self.balance.entry((key, address)).read()
        }

        fn claim_from_forwarder(
            ref self: ContractState, recipient: ContractAddress, leaf_data: Span<felt252>,
        ) {
            // MUST check caller is forwarder
            self.assert_caller_is_forwarder();

            // deserialize leaf_data
            let mut leaf_data = leaf_data;
            let data = Serde::<LeafData>::deserialize(ref leaf_data).unwrap();

            // then use recipient / data
            let amount = data.token_ids.len();

            // increase balance
            let balance = self.balance.entry(('TOKEN_A', recipient)).read();
            self.balance.entry(('TOKEN_A', recipient)).write(balance + amount);
        }

        fn claim_from_forwarder_with_extra_data(
            ref self: ContractState, recipient: ContractAddress, leaf_data: Span<felt252>,
        ) {
            // MUST check caller is forwarder
            self.assert_caller_is_forwarder();

            // deserialize leaf_data
            let mut leaf_data = leaf_data;
            let data = Serde::<LeafDataWithExtraData>::deserialize(ref leaf_data).unwrap();

            // increase TOKEN_A balance
            let balance = self.balance.entry(('TOKEN_A', recipient)).read();
            self.balance.entry(('TOKEN_A', recipient)).write(balance + data.amount_A);

            // increase TOKEN_b balance
            let balance = self.balance.entry(('TOKEN_B', recipient)).read();
            self.balance.entry(('TOKEN_B', recipient)).write(balance + data.amount_B);
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn assert_caller_is_forwarder(self: @ContractState) {
            let caller = starknet::get_caller_address();
            let forwarder_address = self.forwarder_address.read();
            assert!(caller == forwarder_address, "caller is not forwarder");
        }
    }
}
