// Constants
pub mod constants {
    pub mod contracts;
    pub mod interface;
}

pub mod tests {
    pub mod tests;
    pub mod test_mint_tokens;
    pub mod test_integration;
    pub mod test_claim_with_mocks;
}

pub mod mocks {
    pub mod simple_erc20;
    pub mod mock_lords;
    pub mod mock_loot_survivor;
}

pub mod main;
