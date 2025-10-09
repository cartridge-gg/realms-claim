#[derive(Drop, Copy, Clone, Serde, PartialEq)]
pub struct LeafData {
    pub token_ids: Span<felt252>,
}
