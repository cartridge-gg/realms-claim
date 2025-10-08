#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const};
    use realms_claim::main::{LeafData, LeafDataWithExtraData};
    use realms_claim::constants::contracts::{
        FORWARDER_ADDRESS, LORDS_TOKEN_ADDRESS, LOOT_SURVIVOR_ADDRESS, PISTOLS_DUEL_ADDRESS,
    };

    fn FORWARDER() -> ContractAddress {
        FORWARDER_ADDRESS.try_into().unwrap()
    }

    fn RECIPIENT() -> ContractAddress {
        contract_address_const::<0x123>()
    }

    #[test]
    fn test_leaf_data_serialization_deserialization() {
        // Test LeafData
        let token_ids = array![1, 2, 3];
        let leaf_data = LeafData { token_ids: token_ids.span() };

        let mut serialized = array![];
        leaf_data.serialize(ref serialized);

        let mut span = serialized.span();
        let deserialized = Serde::<LeafData>::deserialize(ref span).unwrap();

        assert(deserialized.token_ids.len() == 3, 'wrong token_ids length');
    }

    #[test]
    fn test_leaf_data_with_extra_data_serialization() {
        // Test LeafDataWithExtraData
        let token_ids = array![1, 2, 3];
        let leaf_data = LeafDataWithExtraData {
            amount_A: 100, amount_B: 200, token_ids: token_ids.span(),
        };

        let mut serialized = array![];
        leaf_data.serialize(ref serialized);

        let mut span = serialized.span();
        let deserialized = Serde::<LeafDataWithExtraData>::deserialize(ref span).unwrap();

        assert(deserialized.amount_A == 100, 'wrong amount_A');
        assert(deserialized.amount_B == 200, 'wrong amount_B');
        assert(deserialized.token_ids.len() == 3, 'wrong token_ids length');
    }

    #[test]
    fn test_contract_constants() {
        // Verify contract addresses are set correctly
        assert(
            LORDS_TOKEN_ADDRESS()
                == contract_address_const::<
                    0x0124aeb495b947201f5faC96fD1138E326AD86195B98df6DEc9009158A533B49,
                >(),
            'wrong LORDS address',
        );

        assert(
            LOOT_SURVIVOR_ADDRESS()
                == contract_address_const::<
                    0x035f581b050a39958b7188ab5c75daaa1f9d3571a0c032203038c898663f31f8,
                >(),
            'wrong LOOT_SURVIVOR address',
        );

        assert(
            PISTOLS_DUEL_ADDRESS()
                == contract_address_const::<
                    0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9,
                >(),
            'wrong PISTOLS_DUEL address',
        );
    }
}
