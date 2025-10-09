use starknet::ContractAddress;

#[starknet::interface]
pub trait ISimpleERC721Mint<TContractState> {
    fn promo_airdrop(ref self: TContractState, to: ContractAddress, seed: felt252) -> u128;
    fn mint_with_id(ref self: TContractState, to: ContractAddress, token_id: u256);
}

#[starknet::contract]
mod SimpleERC721 {
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_token::erc721::{ERC721Component, ERC721HooksEmptyImpl};
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    // ERC721 Mixin
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        next_token_id: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    #[constructor]
    fn constructor(ref self: ContractState, name: ByteArray, symbol: ByteArray, base_uri: ByteArray) {
        self.erc721.initializer(name, symbol, base_uri);
        self.next_token_id.write(1);
    }

    #[abi(embed_v0)]
    impl SimpleERC721MintImpl of super::ISimpleERC721Mint<ContractState> {
        // Promo airdrop function - mints 1 pack with auto-incremented token_id
        // This simulates the Pistols team's promo_airdrop function that mints 1 pack (5 Duelists)
        // The seed parameter would be used for randomness in the real implementation
        fn promo_airdrop(ref self: ContractState, to: ContractAddress, seed: felt252) -> u128 {
            let token_id = self.next_token_id.read();
            self.erc721.mint(to, token_id);
            self.next_token_id.write(token_id + 1);
            token_id.try_into().unwrap() // Return pack_id as u128
        }

        // Helper for tests that need specific token IDs
        fn mint_with_id(ref self: ContractState, to: ContractAddress, token_id: u256) {
            self.erc721.mint(to, token_id);
        }
    }
}
