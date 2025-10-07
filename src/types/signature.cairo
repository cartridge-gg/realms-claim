#[derive(Drop, Copy, Serde, PartialEq)]
pub enum Signature {
    Ethereum: EthereumSignature,
    Starknet: Span<felt252>,
}

#[derive(Drop, Copy, Clone, Serde, PartialEq)]
pub struct EthereumSignature {
    pub v: u32,
    pub r: u256,
    pub s: u256,
}
