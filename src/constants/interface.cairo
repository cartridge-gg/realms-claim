use starknet::ContractAddress;

#[starknet::interface]
pub trait IERC20Token<T> {
    fn transfer_from(
        ref self: T, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    );
}

#[starknet::interface]
pub trait IPistolsDuel<T> {
    fn claim_starter_pack(ref self: T);
}
