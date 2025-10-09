use starknet::{ClassHash, ContractAddress};

const FORWARDER_ROLE: felt252 = selector!("FORWARDER_ROLE");

#[starknet::interface]
pub trait IClaim<T> {
    fn initialize(ref self: T, forwarder_address: ContractAddress);
    fn get_balance(self: @T, key: felt252, address: ContractAddress) -> u32;
    fn claim_from_forwarder(ref self: T, recipient: ContractAddress, leaf_data: Span<felt252>);
}

#[starknet::contract]
mod ClaimContract {
    use openzeppelin_access::accesscontrol::{AccessControlComponent, DEFAULT_ADMIN_ROLE};
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_upgrades::UpgradeableComponent;
    use openzeppelin_upgrades::interface::IUpgradeable;
    use realms_claim::constants::interface::{
        IERC20TokenDispatcher, IERC20TokenDispatcherTrait, ITokenInterfaceDispatcher,
        ITokenInterfaceDispatcherTrait,
    };
    use realms_claim::constants::units::TEN_POW_18;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use super::*;

    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
    component!(path: AccessControlComponent, storage: accesscontrol, event: AccessControlEvent);

    // External
    #[abi(embed_v0)]
    impl AccessControlMixinImpl =
        AccessControlComponent::AccessControlMixinImpl<ContractState>;

    // Internal
    impl AccessControlInternalImpl = AccessControlComponent::InternalImpl<ContractState>;
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        balance: Map<(felt252, ContractAddress), u32>,
        lords_token_address: ContractAddress,
        loot_survivor_address: ContractAddress,
        pistols_address: ContractAddress,
        treasury_address: ContractAddress,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        accesscontrol: AccessControlComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        AccessControlEvent: AccessControlComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        forwarder_address: ContractAddress,
        lords_token_address: ContractAddress,
        loot_survivor_address: ContractAddress,
        pistols_address: ContractAddress,
        treasury_address: ContractAddress,
    ) {
        self.accesscontrol.initializer();
        self.accesscontrol._grant_role(DEFAULT_ADMIN_ROLE, owner);
        self.accesscontrol._grant_role(FORWARDER_ROLE, forwarder_address);

        // Store token and treasury addresses
        self.lords_token_address.write(lords_token_address);
        self.loot_survivor_address.write(loot_survivor_address);
        self.pistols_address.write(pistols_address);
        self.treasury_address.write(treasury_address);
    }

    #[abi(embed_v0)]
    impl ClaimImpl of IClaim<ContractState> {
        fn initialize(ref self: ContractState, forwarder_address: ContractAddress) {
            self.accesscontrol._grant_role(FORWARDER_ROLE, forwarder_address);
        }

        fn get_balance(self: @ContractState, key: felt252, address: ContractAddress) -> u32 {
            self.balance.entry((key, address)).read()
        }

        fn claim_from_forwarder(
            ref self: ContractState, recipient: ContractAddress, leaf_data: Span<felt252>,
        ) {
            // MUST check caller is forwarder
            self.accesscontrol.assert_only_role(FORWARDER_ROLE);
            // Transfer tokens and mint NFT pack
            self.mint_tokens(recipient);
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn mint_tokens(self: @ContractState, recipient: ContractAddress) {
            let treasury = self.treasury_address.read();

            // Transfer 386 LORDS tokens from treasury to recipient
            let lords_amount: u256 = 386 * TEN_POW_18;
            let lords_token = IERC20TokenDispatcher {
                contract_address: self.lords_token_address.read(),
            };
            lords_token.transfer_from(treasury, recipient, lords_amount);

            // Transfer 3 Loot Survivor Dungeon tokens from treasury to recipient
            let loot_survivor = IERC20TokenDispatcher {
                contract_address: self.loot_survivor_address.read(),
            };
            loot_survivor.transfer_from(treasury, recipient, 3 * TEN_POW_18);

            // Call Pistols mint_to function
            // The Pistols team will handle randomness and minting logic internally
            // Mints 1 pack (5 Duelists) to the recipient
            let pistols = ITokenInterfaceDispatcher {
                contract_address: self.pistols_address.read(),
            };
            pistols.mint_to(recipient);
        }
    }


    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.accesscontrol.assert_only_role(DEFAULT_ADMIN_ROLE);
            self.upgradeable.upgrade(new_class_hash);
        }
    }
}
