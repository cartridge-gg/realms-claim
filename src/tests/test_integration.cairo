#[cfg(test)]
mod test_integration {
    use starknet::{ContractAddress, contract_address_const};
    use snforge_std::{
        declare, DeclareResultTrait, ContractClassTrait, start_cheat_caller_address
    };
    use realms_claim::main::IClaimDispatcher;
    use realms_claim::mocks::simple_erc20::{
        ISimpleERC20Dispatcher, ISimpleERC20DispatcherTrait
    };

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
        let contract = declare("SimpleERC20").unwrap();
        let initial_supply: u256 = 10000 * 1000000000000000000; // 10,000 tokens with 18 decimals

        let mut calldata = array![];
        name.serialize(ref calldata);
        symbol.serialize(ref calldata);
        calldata.append(18); // decimals
        calldata.append(initial_recipient.into());
        Serde::serialize(@initial_supply, ref calldata);

        let (contract_address, _) = contract.deploy(@calldata).unwrap();

        ISimpleERC20Dispatcher { contract_address }
    }

    fn deploy_claim_contract() -> IClaimDispatcher {
        let contract = declare("ClaimContract").unwrap();
        let (contract_address, _) = contract
            .deploy(@array![OWNER().into(), FORWARDER().into()])
            .unwrap();
        IClaimDispatcher { contract_address }
    }

    #[test]
    fn test_full_claim_flow_with_mocks() {
        // Deploy contracts
        let mock_lords = deploy_mock_token("Mock LORDS", "mLORDS", OWNER());
        let mock_ls = deploy_mock_token("Mock Loot Survivor", "mLS", OWNER());
        let claim_contract = deploy_claim_contract();

        // Verify initial balances
        let owner_lords_balance = mock_lords.balance_of(OWNER());
        assert(owner_lords_balance == 10000 * 1000000000000000000, 'wrong initial LORDS');

        let owner_ls_balance = mock_ls.balance_of(OWNER());
        assert(owner_ls_balance == 10000 * 1000000000000000000, 'wrong initial LS');

        // Transfer tokens to claim contract (as OWNER)
        start_cheat_caller_address(mock_lords.contract_address, OWNER());
        let transfer_amount: u256 = 500 * 1000000000000000000; // 500 tokens
        mock_lords.transfer(claim_contract.contract_address, transfer_amount);
        mock_ls.transfer(claim_contract.contract_address, transfer_amount);

        // Verify claim contract received tokens
        let claim_lords_balance = mock_lords.balance_of(claim_contract.contract_address);
        assert(claim_lords_balance == transfer_amount, 'claim contract no LORDS');

        let claim_ls_balance = mock_ls.balance_of(claim_contract.contract_address);
        assert(claim_ls_balance == transfer_amount, 'claim contract no LS');

        // Verify OWNER balance decreased
        let owner_lords_after = mock_lords.balance_of(OWNER());
        let expected_owner_balance: u256 = 9500 * 1000000000000000000;
        assert(owner_lords_after == expected_owner_balance, 'wrong OWNER LORDS balance');

        // NOTE: We can't test the actual claim without mocking the external contracts
        // (LORDS, Loot Survivor, Pistols) that the claim contract tries to call.
        // But we've verified:
        // 1. Mock tokens deploy correctly
        // 2. Tokens can be transferred to claim contract
        // 3. Balances are tracked correctly
    }

    #[test]
    fn test_mock_token_transfer_from() {
        let mock_token = deploy_mock_token("Test Token", "TEST", OWNER());

        // OWNER approves claim contract
        start_cheat_caller_address(mock_token.contract_address, OWNER());
        let approval_amount: u256 = 1000 * 1000000000000000000;
        mock_token.approve(RECIPIENT(), approval_amount);

        // Verify allowance
        let allowance = mock_token.allowance(OWNER(), RECIPIENT());
        assert(allowance == approval_amount, 'wrong allowance');

        // RECIPIENT transfers from OWNER
        start_cheat_caller_address(mock_token.contract_address, RECIPIENT());
        let transfer_amount: u256 = 100 * 1000000000000000000;
        mock_token.transfer_from(OWNER(), RECIPIENT(), transfer_amount);

        // Verify balances
        let recipient_balance = mock_token.balance_of(RECIPIENT());
        assert(recipient_balance == transfer_amount, 'wrong recipient balance');

        let owner_balance = mock_token.balance_of(OWNER());
        let expected_owner: u256 = 9900 * 1000000000000000000;
        assert(owner_balance == expected_owner, 'wrong owner balance');

        // Verify remaining allowance
        let remaining_allowance = mock_token.allowance(OWNER(), RECIPIENT());
        assert(
            remaining_allowance == approval_amount - transfer_amount, 'wrong remaining allowance'
        );
    }

    #[test]
    fn test_mock_token_mint() {
        let mock_token = deploy_mock_token("Test Token", "TEST", OWNER());

        let initial_balance = mock_token.balance_of(RECIPIENT());
        assert(initial_balance == 0, 'recipient should have 0');

        // Mint to recipient
        let mint_amount: u256 = 500 * 1000000000000000000;
        mock_token.mint(RECIPIENT(), mint_amount);

        let new_balance = mock_token.balance_of(RECIPIENT());
        assert(new_balance == mint_amount, 'wrong balance after mint');

        // Total supply should increase
        let total_supply = mock_token.total_supply();
        assert(
            total_supply == 10000 * 1000000000000000000 + mint_amount, 'wrong total supply'
        );
    }
}
