#[cfg(test)]
mod test_claim_with_mocks {
    use starknet::{ContractAddress, contract_address_const};
    use snforge_std::{
        declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address
    };
    use realms_claim::mocks::simple_erc20::{ISimpleERC20Dispatcher, ISimpleERC20DispatcherTrait};

    // Mock claim contract interface that accepts token addresses
    #[starknet::interface]
    pub trait IMockClaimContract<T> {
        fn claim_tokens(
            ref self: T,
            recipient: ContractAddress,
            lords_token: ContractAddress,
            ls_token: ContractAddress
        );
    }

    // Helper functions for test addresses
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
        name: ByteArray, symbol: ByteArray, initial_recipient: ContractAddress
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

    #[test]
    fn test_complete_claim_flow_with_mocks() {
        // Step 1: Deploy mock tokens
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock Loot Survivor", "mLS", OWNER());

        // Step 2: Verify initial balances
        let owner_lords = mock_lords.balance_of(OWNER());
        assert(owner_lords == 10000 * 1000000000000000000, 'wrong initial LORDS');

        let owner_ls = mock_ls.balance_of(OWNER());
        assert(owner_ls == 10000 * 1000000000000000000, 'wrong initial LS');

        // Step 3: Create a "claim contract" address (simulated)
        let claim_contract_addr = contract_address_const::<'CLAIM_CONTRACT'>();

        // Step 4: Transfer tokens from OWNER to claim contract
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let lords_amount: u256 = 1000 * 1000000000000000000; // 1000 LORDS
        mock_lords.transfer(claim_contract_addr, lords_amount);

        start_cheat_caller_address(mock_ls.contract_address, OWNER());
        let ls_amount: u256 = 100; // 100 LS tokens
        mock_ls.transfer(claim_contract_addr, ls_amount);

        // Step 5: Verify claim contract has tokens
        let claim_lords_bal = mock_lords.balance_of(claim_contract_addr);
        assert(claim_lords_bal == lords_amount, 'claim contract no LORDS');

        let claim_ls_bal = mock_ls.balance_of(claim_contract_addr);
        assert(claim_ls_bal == ls_amount, 'claim contract no LS');

        // Step 6: Claim contract approves itself to spend tokens (for transfer_from pattern)
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.approve(claim_contract_addr, lords_amount);

        start_cheat_caller_address(mock_ls.contract_address, claim_contract_addr);
        mock_ls.approve(claim_contract_addr, ls_amount);

        // Step 7: Simulate a claim using transfer_from (how real contract works)
        let claim_lords_amount: u256 = 386 * 1000000000000000000; // 386 LORDS
        let claim_ls_amount: u256 = 3; // 3 LS tokens

        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.transfer_from(claim_contract_addr, RECIPIENT(), claim_lords_amount);

        start_cheat_caller_address(mock_ls.contract_address, claim_contract_addr);
        mock_ls.transfer_from(claim_contract_addr, RECIPIENT(), claim_ls_amount);

        // Step 8: Verify recipient received tokens
        let recipient_lords = mock_lords.balance_of(RECIPIENT());
        assert(recipient_lords == claim_lords_amount, 'recipient no LORDS');

        let recipient_ls = mock_ls.balance_of(RECIPIENT());
        assert(recipient_ls == claim_ls_amount, 'recipient no LS');

        // Step 9: Verify claim contract balances decreased
        let claim_lords_after = mock_lords.balance_of(claim_contract_addr);
        assert(claim_lords_after == lords_amount - claim_lords_amount, 'wrong claim LORDS');

        let claim_ls_after = mock_ls.balance_of(claim_contract_addr);
        assert(claim_ls_after == ls_amount - claim_ls_amount, 'wrong claim LS');
    }

    #[test]
    fn test_multiple_claims_scenario() {
        // Deploy mock tokens
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock Loot Survivor", "mLS", OWNER());

        let claim_contract_addr = contract_address_const::<'CLAIM_CONTRACT'>();

        // Fund claim contract with enough for multiple claims
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let total_lords: u256 = 2000 * 1000000000000000000; // 2000 LORDS
        mock_lords.transfer(claim_contract_addr, total_lords);

        start_cheat_caller_address(mock_ls.contract_address, OWNER());
        let total_ls: u256 = 20; // 20 LS tokens
        mock_ls.transfer(claim_contract_addr, total_ls);

        // Claim contract approves itself for transfer_from
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.approve(claim_contract_addr, total_lords);

        start_cheat_caller_address(mock_ls.contract_address, claim_contract_addr);
        mock_ls.approve(claim_contract_addr, total_ls);

        // Simulate 3 claims
        let recipient1 = contract_address_const::<'RECIPIENT1'>();
        let recipient2 = contract_address_const::<'RECIPIENT2'>();
        let recipient3 = contract_address_const::<'RECIPIENT3'>();

        let lords_per_claim: u256 = 386 * 1000000000000000000;
        let ls_per_claim: u256 = 3;

        // Claim 1
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.transfer_from(claim_contract_addr, recipient1, lords_per_claim);
        start_cheat_caller_address(mock_ls.contract_address, claim_contract_addr);
        mock_ls.transfer_from(claim_contract_addr, recipient1, ls_per_claim);

        // Claim 2
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.transfer_from(claim_contract_addr, recipient2, lords_per_claim);
        start_cheat_caller_address(mock_ls.contract_address, claim_contract_addr);
        mock_ls.transfer_from(claim_contract_addr, recipient2, ls_per_claim);

        // Claim 3
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.transfer_from(claim_contract_addr, recipient3, lords_per_claim);
        start_cheat_caller_address(mock_ls.contract_address, claim_contract_addr);
        mock_ls.transfer_from(claim_contract_addr, recipient3, ls_per_claim);

        // Verify all recipients got their tokens
        assert(mock_lords.balance_of(recipient1) == lords_per_claim, 'recipient1 no LORDS');
        assert(mock_ls.balance_of(recipient1) == ls_per_claim, 'recipient1 no LS');

        assert(mock_lords.balance_of(recipient2) == lords_per_claim, 'recipient2 no LORDS');
        assert(mock_ls.balance_of(recipient2) == ls_per_claim, 'recipient2 no LS');

        assert(mock_lords.balance_of(recipient3) == lords_per_claim, 'recipient3 no LORDS');
        assert(mock_ls.balance_of(recipient3) == ls_per_claim, 'recipient3 no LS');

        // Verify claim contract balance
        let expected_lords_left: u256 = total_lords - (lords_per_claim * 3);
        let expected_ls_left: u256 = total_ls - (ls_per_claim * 3);

        assert(
            mock_lords.balance_of(claim_contract_addr) == expected_lords_left,
            'wrong remaining LORDS'
        );
        assert(mock_ls.balance_of(claim_contract_addr) == expected_ls_left, 'wrong remaining LS');
    }

    #[test]
    fn test_claim_with_transfer_from() {
        // Test using transfer_from pattern (how the real contract works)
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let claim_contract_addr = contract_address_const::<'CLAIM_CONTRACT'>();

        // Transfer tokens to claim contract
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let amount: u256 = 1000 * 1000000000000000000;
        mock_lords.transfer(claim_contract_addr, amount);

        // Claim contract approves itself to spend its own tokens
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        mock_lords.approve(claim_contract_addr, amount);

        // Verify allowance
        let allowance = mock_lords.allowance(claim_contract_addr, claim_contract_addr);
        assert(allowance == amount, 'wrong allowance');

        // Transfer using transfer_from (as the claim contract would)
        let claim_amount: u256 = 386 * 1000000000000000000;
        mock_lords.transfer_from(claim_contract_addr, RECIPIENT(), claim_amount);

        // Verify recipient got tokens
        assert(mock_lords.balance_of(RECIPIENT()) == claim_amount, 'recipient no tokens');

        // Verify allowance decreased
        let remaining_allowance = mock_lords.allowance(claim_contract_addr, claim_contract_addr);
        assert(remaining_allowance == amount - claim_amount, 'wrong remaining allowance');
    }

    #[test]
    #[should_panic(expected: ('Insufficient allowance',))]
    fn test_insufficient_allowance_fails() {
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let claim_contract_addr = contract_address_const::<'CLAIM_CONTRACT'>();

        // Transfer 1000 LORDS to claim contract
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let transfer_amount: u256 = 1000 * 1000000000000000000;
        mock_lords.transfer(claim_contract_addr, transfer_amount);

        // Only approve 100 LORDS
        start_cheat_caller_address(mock_lords.contract_address, claim_contract_addr);
        let small_approval: u256 = 100 * 1000000000000000000;
        mock_lords.approve(claim_contract_addr, small_approval);

        // Try to claim 386 LORDS (should fail - insufficient allowance)
        let claim_amount: u256 = 386 * 1000000000000000000;
        mock_lords.transfer_from(claim_contract_addr, RECIPIENT(), claim_amount); // Should panic
    }
}
