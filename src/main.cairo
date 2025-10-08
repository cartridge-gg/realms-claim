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
    use realms_claim::constants::contracts::{
        LOOT_SURVIVOR_ADDRESS, LORDS_TOKEN_ADDRESS, PISTOLS_DUEL_ADDRESS,
    };
    use realms_claim::constants::interface::{
        CharacterKey, DuelistProfile, ILootSurvivorDispatcher, ILootSurvivorDispatcherTrait,
        ILordsTokenDispatcher, ILordsTokenDispatcherTrait, IPistolsDuelDispatcher,
        IPistolsDuelDispatcherTrait, PaymentType, PoolType,
    };
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use super::*;

    #[storage]
    struct Storage {
        forwarder_address: ContractAddress,
        balance: Map<(felt252, ContractAddress), u32>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, forwarder_address: ContractAddress) {
        self.forwarder_address.write(forwarder_address);
    }

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
            let _data = Serde::<LeafData>::deserialize(ref leaf_data).unwrap();

            // mint both tokens
            self.mint_tokens(recipient);
        }

        fn claim_from_forwarder_with_extra_data(
            ref self: ContractState, recipient: ContractAddress, leaf_data: Span<felt252>,
        ) {
            // MUST check caller is forwarder
            self.assert_caller_is_forwarder();

            // deserialize leaf_data
            let mut leaf_data = leaf_data;
            let _data = Serde::<LeafDataWithExtraData>::deserialize(ref leaf_data).unwrap();

            // mint both tokens
            self.mint_tokens(recipient);
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn assert_caller_is_forwarder(self: @ContractState) {
            let caller = starknet::get_caller_address();
            let forwarder_address = self.forwarder_address.read();
            assert!(caller == forwarder_address, "caller is not forwarder");
        }

        fn mint_tokens(self: @ContractState, recipient: ContractAddress) {
            // Mint 386 LORDS tokens
            let lords_amount: u256 = 386 * 1000000000000000000;
            let lords_token = ILordsTokenDispatcher { contract_address: LORDS_TOKEN_ADDRESS() };
            lords_token.mint(recipient, lords_amount);

            // Mint 3 Loot Survivor game via buy_game with Ticket payment
            let loot_survivor = ILootSurvivorDispatcher {
                contract_address: LOOT_SURVIVOR_ADDRESS(),
            };
            loot_survivor
                .buy_game(PaymentType::Ticket, Option::Some('Adventurer'), recipient, false);
            loot_survivor
                .buy_game(PaymentType::Ticket, Option::Some('Adventurer'), recipient, false);
            loot_survivor
                .buy_game(PaymentType::Ticket, Option::Some('Adventurer'), recipient, false);

            // Mint Pistols duelists
            let pistols_duel = IPistolsDuelDispatcher { contract_address: PISTOLS_DUEL_ADDRESS() };
            pistols_duel
                .mint_duelists(
                    recipient,
                    1,
                    DuelistProfile::Character(CharacterKey::Player),
                    0,
                    PoolType::Claimable,
                    100,
                );
            pistols_duel
                .mint_duelists(
                    recipient,
                    1,
                    DuelistProfile::Character(CharacterKey::Player),
                    0,
                    PoolType::Claimable,
                    100,
                );
            pistols_duel
                .mint_duelists(
                    recipient,
                    1,
                    DuelistProfile::Character(CharacterKey::Player),
                    0,
                    PoolType::Claimable,
                    100,
                );
        }
    }
}
