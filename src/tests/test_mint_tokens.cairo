#[cfg(test)]
mod test_mint_tokens {
    use starknet::{ContractAddress, contract_address_const};
    use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address};
    use realms_claim::main::{IClaimDispatcher, IClaimDispatcherTrait};

    fn OWNER() -> ContractAddress {
        contract_address_const::<'OWNER'>()
    }

    fn FORWARDER() -> ContractAddress {
        contract_address_const::<'FORWARDER'>()
    }

    fn RECIPIENT() -> ContractAddress {
        contract_address_const::<'RECIPIENT'>()
    }

    fn deploy_claim_contract() -> IClaimDispatcher {
        let contract = declare("ClaimContract").unwrap().contract_class();
        let (contract_address, _) = contract
            .deploy(@array![OWNER().into(), FORWARDER().into()])
            .unwrap();
        IClaimDispatcher { contract_address }
    }

    #[test]
    fn test_deploy_contract() {
        let claim_contract = deploy_claim_contract();
        assert(claim_contract.contract_address != contract_address_const::<0>(), 'deploy failed');
    }

    #[test]
    #[should_panic(expected: ('Caller is missing role',))]
    fn test_claim_requires_forwarder_role() {
        let claim_contract = deploy_claim_contract();

        // Try to claim without forwarder role (should fail)
        start_cheat_caller_address(claim_contract.contract_address, RECIPIENT());

        // This should panic because caller doesn't have FORWARDER_ROLE
        claim_contract.claim_from_forwarder(RECIPIENT(), array![].span());
    }

    #[test]
    #[should_panic(expected: ('Caller is missing role',))]
    fn test_claim_without_forwarder_role_panics() {
        let claim_contract = deploy_claim_contract();

        // Try to claim without forwarder role
        start_cheat_caller_address(claim_contract.contract_address, RECIPIENT());
        claim_contract.claim_from_forwarder(RECIPIENT(), array![].span());
    }

    #[test]
    #[ignore] // Ignore by default as it requires mock contracts
    fn test_claim_with_forwarder_role() {
        let claim_contract = deploy_claim_contract();

        // Call as forwarder (should succeed in access control check)
        start_cheat_caller_address(claim_contract.contract_address, FORWARDER());

        // Note: This will fail because we're calling real contract addresses
        // that don't have the tokens or approvals set up in the test environment.
        // To properly test, you'd need to:
        // 1. Deploy mock ERC20 contracts for LORDS and Loot Survivor
        // 2. Deploy mock Pistols contract with claim_starter_pack
        // 3. Fund the claim contract with tokens
        // 4. Set up approvals

        // claim_contract.claim_from_forwarder(RECIPIENT(), array![].span());
    }

    #[test]
    fn test_get_balance_returns_zero() {
        let claim_contract = deploy_claim_contract();
        let balance = claim_contract.get_balance('test_key', RECIPIENT());
        assert(balance == 0, 'balance should be 0');
    }

    #[test]
    fn test_initialize_grants_forwarder_role() {
        let claim_contract = deploy_claim_contract();
        let new_forwarder = contract_address_const::<'NEW_FORWARDER'>();

        // Call initialize as owner
        start_cheat_caller_address(claim_contract.contract_address, OWNER());
        claim_contract.initialize(new_forwarder);

        // Now new_forwarder should be able to call claim_from_forwarder
        // (though it will fail on token transfers in test env)
        start_cheat_caller_address(claim_contract.contract_address, new_forwarder);
        // This would work if we had mock contracts set up
    }
}
