use starknet::ContractAddress;

#[starknet::interface]
pub trait IERC20Token<T> {
    fn transfer_from(
        ref self: T, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    );
}

#[starknet::interface]
pub trait IERC721Token<T> {
    fn transfer_from(
        ref self: T, from: ContractAddress, to: ContractAddress, token_id: u256,
    );
}


#[starknet::interface]
pub trait ITokenInterface<T> {
    fn promo_airdrop(
        ref self: T,
        recipient: ContractAddress,
        seed: felt252,
    ) -> u128;
}
