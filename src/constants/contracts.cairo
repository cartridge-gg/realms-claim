use starknet::ContractAddress;

pub const FORWARDER_ADDRESS: felt252 =
    0x50a858cf7abee543a5709f789a0b01482bfe940d65bb12aa13fabf65e048a26;

pub fn LORDS_TOKEN_ADDRESS() -> ContractAddress {
    starknet::contract_address_const::<
        0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49,
    >()
}

pub fn LOOT_SURVIVOR_ADDRESS() -> ContractAddress {
    starknet::contract_address_const::<
        0x00a67ef20b61a9846e1c82b411175e6ab167ea9f8632bd6c2091823c3629ec42,
    >()
}

pub fn PISTOLS_DUEL_ADDRESS() -> ContractAddress {
    starknet::contract_address_const::<
        0x07aaa9866750a0db82a54ba8674c38620fa2f967d2fbb31133def48e0527c87f,
    >()
}
