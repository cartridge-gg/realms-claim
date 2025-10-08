use starknet::ContractAddress;

#[derive(Drop, Serde, Clone)]
pub struct GoldenPassInfo {
    pub address: ContractAddress,
    pub token_id: u128,
}

#[derive(Drop, Serde, Clone)]
pub enum PaymentType {
    Ticket,
    GoldenPass: GoldenPassInfo,
}

#[derive(Serde, Copy, Drop, PartialEq)]
pub enum PoolType {
    Undefined, // 0
    Purchases, // 1
    FamePeg, // 2
    Season: u32, // 3
    Tournament: u64, // 4
    Sacrifice, // 5
    Claimable // 6
}

//--------------------------
// DuelistProfile
//
#[derive(Copy, Drop, Serde, PartialEq)]
pub enum DuelistProfile {
    Undefined,
    Character: CharacterKey, // Character(id)
    Bot: BotKey, // Bot(id)
    Genesis: GenesisKey, // Genesis(id)
    Legends: LegendsKey // Legends(id)
    // Eternum: u16,   // Eternum(realm id)
}

//--------------------------
// Profiles
//
#[derive(Copy, Drop, Serde, PartialEq)]
pub enum CharacterKey {
    Unknown,
    Bartender,
    Drunkard,
    Devil,
    Player,
    ImpMaster,
}

#[derive(Copy, Drop, Serde, PartialEq)]
pub enum BotKey {
    Unknown,
    TinMan, // Villainous
    Scarecrow, // Trickster
    Leon, // Honourable
    Pro // Unpredictable
}

#[derive(Copy, Drop, Serde, PartialEq)]
pub enum GenesisKey {
    Unknown, // 0
    SerWalker, // 1
    LadyVengeance, // 2
    Duke, // 3
    Duella, // 4
    Jameson, // 5
    Misty, // 6
    Karaku, // 7
    Kenzu, // 8
    Pilgrim, // 9
    Jack, // 10
    Pops, // 11
    NynJah, // 12
    Thrak, // 13
    Bloberto, // 14
    Squiddo, // 15
    SlenderDuck, // 16
    Breadman, // 17
    Groggus, // 18
    Pistolopher, // 19
    Secreto, // 20
    ShadowMare, // 21
    Fjolnir, // 22
    ChimpDylan, // 23
    Hinata, // 24
    HelixVex, // 25
    BuccaneerJames, // 26
    TheSensei, // 27
    SenseiTarrence, // 28
    ThePainter, // 29
    Ashe, // 30
    SerGogi, // 31
    TheSurvivor, // 32
    TheFrenchman, // 33
    SerFocger, // 34
    SillySosij, // 35
    BloodBeard, // 36
    Fredison, // 37
    TheBard, // 38
    Ponzimancer, // 39
    DealerTani, // 40
    SerRichard, // 41
    Recipromancer, // 42
    Mataleone, // 43
    FortunaRegem, // 44
    Amaro, // 45
    Mononoke, // 46
    Parsa, // 47
    Jubilee, // 48
    LadyOfCrows, // 49
    BananaDuke, // 50
    LordGladstone, // 51
    LadyStrokes, // 52
    Bliss, // 53
    StormMirror, // 54
    Aldreda, // 55
    Petronella, // 56
    SeraphinaRose, // 57
    LucienDeSombrel, // 58
    FyernVirelock, // 59
    Noir, // 60
    QueenAce, // 61
    JoshPeel, // 62
    IronHandRogan, // 63
    GoodPupStarky, // 64
    ImyaSuspect, // 65
    TheAlchemist, // 66
    PonziusPilate, // 67
    MistressNoodle, // 68
    MasterOfSecrets // 69
}

#[derive(Copy, Drop, Serde, PartialEq)]
pub enum LegendsKey {
    Unknown,
    TGC1,
    TGC2,
}


//--------------------------
// Collection Descriptors
//
#[derive(Copy, Drop, Serde, Default)]
pub struct CollectionDescriptor {
    pub name: felt252, // @generateContants:shortstring
    pub folder_name: felt252, // @generateContants:shortstring
    pub profile_count: u8, // number of profiles in the collection
    pub is_playable: bool, // playes can use
    pub duelist_id_base: u128 // for characters (tutorials) and practice bots
}

#[starknet::interface]
pub trait ILordsToken<T> {
    fn mint(ref self: T, recipient: ContractAddress, amount: u256);
}

#[starknet::interface]
pub trait ILootSurvivor<T> {
    fn buy_game(
        ref self: T,
        payment_type: PaymentType,
        player_name: Option<felt252>,
        to: ContractAddress,
        soulboud: bool,
    );
}

#[starknet::interface]
pub trait IPistolsDuel<T> {
    fn mint_duelists(
        ref self: T,
        recipient: ContractAddress,
        quantity: usize,
        profile_type: DuelistProfile,
        seed: felt252,
        pool_type: PoolType,
        lords_amount: u128,
    ) -> Span<u128>;
}
