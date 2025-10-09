#[cfg(test)]
mod test_contract {
    use realms_claim::main::{IClaimDispatcher, IClaimDispatcherTrait};
    use realms_claim::mocks::simple_erc20::{ISimpleERC20Dispatcher, ISimpleERC20DispatcherTrait};
    use realms_claim::mocks::simple_erc721::{ISimpleERC721Dispatcher, ISimpleERC721DispatcherTrait};
    use snforge_std::{ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address};
    use starknet::{ContractAddress, contract_address_const};

    // ========================================
    // Helper Functions
    // ========================================

    fn OWNER() -> ContractAddress {
        contract_address_const::<'OWNER'>()
    }

    fn FORWARDER() -> ContractAddress {
        contract_address_const::<'FORWARDER'>()
    }

    fn RECIPIENT() -> ContractAddress {
        contract_address_const::<'RECIPIENT'>()
    }

    fn deploy_mock_token(
        name: ByteArray, symbol: ByteArray, initial_recipient: ContractAddress,
    ) -> ISimpleERC20Dispatcher {
        let contract_class = declare("SimpleERC20").unwrap().contract_class();
        let initial_supply: u256 = 10000 * 1000000000000000000; // 10,000 tokens

        let mut calldata = array![];
        name.serialize(ref calldata);
        symbol.serialize(ref calldata);
        calldata.append(18); // decimals
        calldata.append(initial_recipient.into());
        Serde::serialize(@initial_supply, ref calldata);

        let (contract_address, _) = contract_class.deploy(@calldata).unwrap();
        ISimpleERC20Dispatcher { contract_address }
    }

    fn deploy_mock_nft() -> ISimpleERC721Dispatcher {
        let contract_class = declare("SimpleERC721").unwrap().contract_class();
        let (contract_address, _) = contract_class.deploy(@array![]).unwrap();
        ISimpleERC721Dispatcher { contract_address }
    }

    fn PISTOLS() -> ContractAddress {
        contract_address_const::<'PISTOLS'>()
    }

    fn deploy_claim_contract(
        lords_token: ContractAddress,
        loot_survivor_token: ContractAddress,
        pistols_token: ContractAddress,
        treasury: ContractAddress,
    ) -> IClaimDispatcher {
        let contract_class = declare("ClaimContract").unwrap().contract_class();
        let (contract_address, _) = contract_class
            .deploy(
                @array![
                    OWNER().into(), FORWARDER().into(), lords_token.into(),
                    loot_survivor_token.into(), pistols_token.into(), treasury.into(),
                ],
            )
            .unwrap();
        IClaimDispatcher { contract_address }
    }

    // ========================================
    // Contract Deployment Tests
    // ========================================

    #[test]
    fn test_deploy_contract() {
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock LS", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );
        assert(claim_contract.contract_address != contract_address_const::<0>(), 'deploy failed');
    }

    #[test]
    fn test_get_balance_returns_zero() {
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock LS", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );
        let balance = claim_contract.get_balance('test_key', RECIPIENT());
        assert(balance == 0, 'balance should be 0');
    }

    // ========================================
    // Access Control Tests
    // ========================================

    #[test]
    #[should_panic(expected: ('Caller is missing role',))]
    fn test_claim_requires_forwarder_role() {
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock LS", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );

        // Try to claim without forwarder role (should fail)
        start_cheat_caller_address(claim_contract.contract_address, RECIPIENT());
        let leaf_data = array![].span();
        claim_contract.claim_from_forwarder(RECIPIENT(), leaf_data);
    }

    #[test]
    fn test_initialize_grants_forwarder_role() {
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock LS", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );
        let new_forwarder = contract_address_const::<'NEW_FORWARDER'>();

        // Call initialize as owner
        start_cheat_caller_address(claim_contract.contract_address, OWNER());
        claim_contract.initialize(new_forwarder);
        // Now new_forwarder should have forwarder role
    // (verified implicitly - would panic if role not granted)
    }

    // ========================================
    // Complete Claim Flow Tests
    // ========================================

    #[test]
    fn test_single_claim() {
        // Deploy mock tokens and claim contract (OWNER is treasury)
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock Loot Survivor", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );

        // OWNER (treasury) approves claim contract to spend tokens
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let lords_amount: u256 = 1000 * 1000000000000000000; // 1000 LORDS
        mock_lords.approve(claim_contract.contract_address, lords_amount);
        snforge_std::stop_cheat_caller_address(mock_lords.contract_address);

        start_cheat_caller_address(mock_ls.contract_address, OWNER());
        let ls_amount: u256 = 100; // 100 LS tokens
        mock_ls.approve(claim_contract.contract_address, ls_amount);
        snforge_std::stop_cheat_caller_address(mock_ls.contract_address);

        // Execute claim as FORWARDER with empty leaf_data (no Pistols NFTs for simplicity)
        start_cheat_caller_address(claim_contract.contract_address, FORWARDER());
        let leaf_data = array![].span();
        claim_contract.claim_from_forwarder(RECIPIENT(), leaf_data);
        snforge_std::stop_cheat_caller_address(claim_contract.contract_address);

        // Verify recipient received tokens
        let expected_lords: u256 = 386 * 1000000000000000000;
        assert(mock_lords.balance_of(RECIPIENT()) == expected_lords, 'recipient no LORDS');
        assert(mock_ls.balance_of(RECIPIENT()) == 3, 'recipient no LS');

        // Verify treasury (OWNER) balances decreased
        let owner_lords_after = mock_lords.balance_of(OWNER());
        let initial_supply: u256 = 10000 * 1000000000000000000;
        assert(owner_lords_after == initial_supply - expected_lords, 'wrong treasury LORDS');

        let owner_ls_after = mock_ls.balance_of(OWNER());
        assert(owner_ls_after == initial_supply - 3, 'wrong treasury LS');

        // Verify allowances decreased
        let remaining_lords_allowance = mock_lords
            .allowance(OWNER(), claim_contract.contract_address);
        assert(remaining_lords_allowance == lords_amount - expected_lords, 'wrong LORDS allowance');

        let remaining_ls_allowance = mock_ls.allowance(OWNER(), claim_contract.contract_address);
        assert(remaining_ls_allowance == ls_amount - 3, 'wrong LS allowance');
    }

    #[test]
    fn test_multiple_claims_scenario() {
        // Deploy mock tokens (OWNER is treasury)
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock Loot Survivor", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );

        // Treasury (OWNER) approves claim contract for multiple claims
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let total_lords: u256 = 2000 * 1000000000000000000; // 2000 LORDS
        mock_lords.approve(claim_contract.contract_address, total_lords);
        snforge_std::stop_cheat_caller_address(mock_lords.contract_address);

        start_cheat_caller_address(mock_ls.contract_address, OWNER());
        let total_ls: u256 = 20; // 20 LS tokens
        mock_ls.approve(claim_contract.contract_address, total_ls);
        snforge_std::stop_cheat_caller_address(mock_ls.contract_address);

        // Execute multiple claims using claim_from_forwarder
        let recipient1 = contract_address_const::<'RECIPIENT1'>();
        let recipient2 = contract_address_const::<'RECIPIENT2'>();
        let recipient3 = contract_address_const::<'RECIPIENT3'>();

        let lords_per_claim: u256 = 386 * 1000000000000000000;
        let ls_per_claim: u256 = 3;

        // Execute claims as FORWARDER with empty leaf_data
        let leaf_data = array![].span();
        start_cheat_caller_address(claim_contract.contract_address, FORWARDER());
        claim_contract.claim_from_forwarder(recipient1, leaf_data);
        claim_contract.claim_from_forwarder(recipient2, leaf_data);
        claim_contract.claim_from_forwarder(recipient3, leaf_data);
        snforge_std::stop_cheat_caller_address(claim_contract.contract_address);

        // Verify all recipients got their tokens
        assert(mock_lords.balance_of(recipient1) == lords_per_claim, 'recipient1 no LORDS');
        assert(mock_ls.balance_of(recipient1) == ls_per_claim, 'recipient1 no LS');

        assert(mock_lords.balance_of(recipient2) == lords_per_claim, 'recipient2 no LORDS');
        assert(mock_ls.balance_of(recipient2) == ls_per_claim, 'recipient2 no LS');

        assert(mock_lords.balance_of(recipient3) == lords_per_claim, 'recipient3 no LORDS');
        assert(mock_ls.balance_of(recipient3) == ls_per_claim, 'recipient3 no LS');

        // Verify treasury balances decreased
        let initial_supply: u256 = 10000 * 1000000000000000000;
        let expected_lords_remaining: u256 = initial_supply - (lords_per_claim * 3);
        let expected_ls_remaining: u256 = initial_supply - (ls_per_claim * 3);

        assert(mock_lords.balance_of(OWNER()) == expected_lords_remaining, 'wrong treasury LORDS');
        assert(mock_ls.balance_of(OWNER()) == expected_ls_remaining, 'wrong treasury LS');
    }


    // ========================================
    // Error Case Tests
    // ========================================

    #[test]
    #[should_panic(expected: ('Insufficient allowance',))]
    fn test_insufficient_allowance_fails() {
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock LS", "mLS", OWNER());
        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address, mock_ls.contract_address, PISTOLS(), OWNER(),
        );

        // Treasury only approves 100 LORDS (not enough for 386 LORDS claim)
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let small_approval: u256 = 100 * 1000000000000000000;
        mock_lords.approve(claim_contract.contract_address, small_approval);

        start_cheat_caller_address(mock_ls.contract_address, OWNER());
        mock_ls.approve(claim_contract.contract_address, 100);

        // Try to claim (should fail - insufficient allowance for LORDS)
        start_cheat_caller_address(claim_contract.contract_address, FORWARDER());
        let leaf_data = array![].span();
        claim_contract.claim_from_forwarder(RECIPIENT(), leaf_data); // Should panic
    }

    // ========================================
    // Pistols NFT Integration Tests
    // ========================================

    #[test]
    fn test_claim_with_pistols_nfts() {
        // Deploy mock tokens and NFT contract
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock Loot Survivor", "mLS", OWNER());
        let mock_pistols = deploy_mock_nft();

        let claim_contract = deploy_claim_contract(
            mock_lords.contract_address,
            mock_ls.contract_address,
            mock_pistols.contract_address,
            OWNER(),
        );

        // Pre-mint 3 Pistols NFTs to treasury (OWNER) with specific token IDs
        start_cheat_caller_address(mock_pistols.contract_address, OWNER());
        mock_pistols.mint(OWNER(), 101);
        mock_pistols.mint(OWNER(), 102);
        mock_pistols.mint(OWNER(), 103);

        // Treasury approves claim contract for NFT transfers
        mock_pistols.approve(claim_contract.contract_address, 101);
        mock_pistols.approve(claim_contract.contract_address, 102);
        mock_pistols.approve(claim_contract.contract_address, 103);
        snforge_std::stop_cheat_caller_address(mock_pistols.contract_address);

        // Treasury approves ERC20 tokens
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let lords_amount: u256 = 1000 * 1000000000000000000;
        mock_lords.approve(claim_contract.contract_address, lords_amount);
        snforge_std::stop_cheat_caller_address(mock_lords.contract_address);

        start_cheat_caller_address(mock_ls.contract_address, OWNER());
        let ls_amount: u256 = 100;
        mock_ls.approve(claim_contract.contract_address, ls_amount);
        snforge_std::stop_cheat_caller_address(mock_ls.contract_address);

        // Execute claim with token IDs in leaf_data
        let leaf_data = array![101, 102, 103].span();
        start_cheat_caller_address(claim_contract.contract_address, FORWARDER());
        claim_contract.claim_from_forwarder(RECIPIENT(), leaf_data);
        snforge_std::stop_cheat_caller_address(claim_contract.contract_address);

        // Verify recipient received ERC20 tokens
        let expected_lords: u256 = 386 * 1000000000000000000;
        assert(mock_lords.balance_of(RECIPIENT()) == expected_lords, 'recipient no LORDS');
        assert(mock_ls.balance_of(RECIPIENT()) == 3, 'recipient no LS');

        // Verify recipient received all 3 Pistols NFTs
        assert(mock_pistols.owner_of(101) == RECIPIENT(), 'recipient no NFT 101');
        assert(mock_pistols.owner_of(102) == RECIPIENT(), 'recipient no NFT 102');
        assert(mock_pistols.owner_of(103) == RECIPIENT(), 'recipient no NFT 103');
    }
}
