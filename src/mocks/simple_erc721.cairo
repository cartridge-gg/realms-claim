use starknet::ContractAddress;

#[starknet::interface]
pub trait ISimpleERC721<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, token_id: u256);
    fn transfer_from(
        ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256,
    );
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn approve(ref self: TContractState, to: ContractAddress, token_id: u256);
}

#[starknet::contract]
mod SimpleERC721 {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        owners: Map<u256, ContractAddress>,
        approvals: Map<u256, ContractAddress>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl SimpleERC721Impl of super::ISimpleERC721<ContractState> {
        fn mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
            assert(self.owners.entry(token_id).read().is_zero(), 'token already minted');
            self.owners.entry(token_id).write(to);
        }

        fn transfer_from(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
        ) {
            let owner = self.owners.entry(token_id).read();
            assert(owner == from, 'not owner');

            let caller = get_caller_address();
            let approved = self.approvals.entry(token_id).read();
            assert(caller == owner || caller == approved, 'not approved');

            self.owners.entry(token_id).write(to);
            self.approvals.entry(token_id).write(Zero::zero());
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.owners.entry(token_id).read()
        }

        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let owner = self.owners.entry(token_id).read();
            let caller = get_caller_address();
            assert(caller == owner, 'not owner');
            self.approvals.entry(token_id).write(to);
        }
    }
}
