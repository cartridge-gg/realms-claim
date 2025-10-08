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
        0x035f581b050a39958b7188ab5c75daaa1f9d3571a0c032203038c898663f31f8,
    >()
}

pub fn PISTOLS_DUEL_ADDRESS() -> ContractAddress {
    starknet::contract_address_const::<
        0x071333ac75b7d5ba89a2d0c2b67d5b955258a4d46eb42f3428da6137bbbfdfd9,
    >()
}
