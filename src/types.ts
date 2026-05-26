export enum BlockType {
  AIR = 'AIR',
  DIRT = 'DIRT',
  CAVE_WALL = 'CAVE_WALL', // Background
  ROCK = 'ROCK',
  LAVA = 'LAVA',
  GRASS = 'GRASS',
  WOOD_BLOCK = 'WOOD_BLOCK',
  DOOR = 'DOOR',
  SIGN = 'SIGN',
  BRICK = 'BRICK',
  GLASS = 'GLASS',
  WORLD_LOCK = 'WORLD_LOCK'
}

export enum ItemKind {
  BLOCK = 'BLOCK',
  BACKGROUND = 'BACKGROUND',
  SEED = 'SEED',
  EQUIPMENT = 'EQUIPMENT'
}

export interface InventoryItem {
  id: string; // e.g. 'DIRT_BLOCK', 'DIRT_SEED', etc.
  name: string;
  kind: ItemKind;
  targetBlock: BlockType;
  count: number;
  description: string;
}

export interface Player {
  id: string;
  username: string;
  x: number; // grid coords, e.g. 10.5
  y: number;
  vx: number;
  vy: number;
  gems: number;
  worldLocks: number;
  activeEquipment: string | null; // e.g. 'pickaxe', 'wings', 'hat'
  inventory: InventoryItem[];
  guildId: string | null;
  lastActionTime: number;
}

export interface Guild {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  members: { id: string; username: string; rank: string }[];
  gemsDonated: number;
  level: number;
  perkActive: boolean;
}

export interface Recipe {
  id: string;
  seedA: string; // e.g., 'DIRT_SEED'
  seedB: string; // e.g., 'CAVE_WALL_SEED'
  resultItemId: string; // e.g., 'GRASS_SEED'
  chance: number; // 0 to 1
}

export interface TreeState {
  x: number;
  y: number;
  seedType: string;
  plantedAt: number; // Timestamp ms
  readyAt: number; // Timestamp ms
  growthPercent: number; // 0 to 100
}

export interface Tile {
  x: number;
  y: number;
  foreground: BlockType;
  background: BlockType;
  tree: TreeState | null;
  lockedBy: string | null; // username or null
  signText: string | null;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  itemKind: ItemKind;
  targetBlock: BlockType;
  count: number;
  priceGems: number;
  listedAt: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  channel: 'world' | 'guild' | 'system';
  timestamp: number;
}

export interface GameWorld {
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
}

// Map Item ID to full details helper for the Client
export interface ItemDetail {
  id: string;
  name: string;
  kind: ItemKind;
  targetBlock: BlockType;
  color: string;
  description: string;
  canSpliced: boolean;
  spliceResult?: string;
}

export const ITEM_DATABASE: Record<string, ItemDetail> = {
  'DIRT': { id: 'DIRT', name: 'Dirt', kind: ItemKind.BLOCK, targetBlock: BlockType.DIRT, color: '#8B4513', description: 'Just standard rich soil.', canSpliced: true },
  'DIRT_SEED': { id: 'DIRT_SEED', name: 'Dirt Seed', kind: ItemKind.SEED, targetBlock: BlockType.DIRT, color: '#a0522d', description: 'Plant this to grow more soil block trees.', canSpliced: true },
  'CAVE_WALL': { id: 'CAVE_WALL', name: 'Cave Wall', kind: ItemKind.BACKGROUND, targetBlock: BlockType.CAVE_WALL, color: '#424242', description: 'Blocks sunlight from the background.', canSpliced: true },
  'CAVE_WALL_SEED': { id: 'CAVE_WALL_SEED', name: 'Cave Wall Seed', kind: ItemKind.SEED, targetBlock: BlockType.CAVE_WALL, color: '#555555', description: 'Sprouting dark cave backgrounds.', canSpliced: true },
  'ROCK': { id: 'ROCK', name: 'Rock', kind: ItemKind.BLOCK, targetBlock: BlockType.ROCK, color: '#808080', description: 'Heavy and dense hard stone.', canSpliced: true },
  'ROCK_SEED': { id: 'ROCK_SEED', name: 'Rock Seed', kind: ItemKind.SEED, targetBlock: BlockType.ROCK, color: '#999999', description: 'Planted rocks sprout sturdier materials.', canSpliced: true },
  'LAVA': { id: 'LAVA', name: 'Lava', kind: ItemKind.BLOCK, targetBlock: BlockType.LAVA, color: '#FF3300', description: 'Danger! Hot molten rock. Inflicts contact damage.', canSpliced: true },
  'LAVA_SEED': { id: 'LAVA_SEED', name: 'Lava Seed', kind: ItemKind.SEED, targetBlock: BlockType.LAVA, color: '#FF6600', description: 'Warm to the touch. Spreads glowing paths.', canSpliced: true },
  'GRASS': { id: 'GRASS', name: 'Grass', kind: ItemKind.BLOCK, targetBlock: BlockType.GRASS, color: '#32CD32', description: 'Lush green sod block.', canSpliced: true },
  'GRASS_SEED': { id: 'GRASS_SEED', name: 'Grass Seed', kind: ItemKind.SEED, targetBlock: BlockType.GRASS, color: '#3cb371', description: 'Rich green grass seed spliced from Dirt and Cave Dirt.', canSpliced: true },
  'WOOD_BLOCK': { id: 'WOOD_BLOCK', name: 'Wood Block', kind: ItemKind.BLOCK, targetBlock: BlockType.WOOD_BLOCK, color: '#CD853F', description: 'Sturdy building lumber block.', canSpliced: true },
  'WOOD_BLOCK_SEED': { id: 'WOOD_BLOCK_SEED', name: 'Wood Seed', kind: ItemKind.SEED, targetBlock: BlockType.WOOD_BLOCK, color: '#d2b48c', description: 'Wooden branches sprout lumber block yields.', canSpliced: true },
  'DOOR': { id: 'DOOR', name: 'Door', kind: ItemKind.BLOCK, targetBlock: BlockType.DOOR, color: '#A0522D', description: 'Used to enter and leave distinct areas quickly.', canSpliced: true },
  'DOOR_SEED': { id: 'DOOR_SEED', name: 'Door Seed', kind: ItemKind.SEED, targetBlock: BlockType.DOOR, color: '#8a4b2a', description: 'Growing portals.', canSpliced: true },
  'SIGN': { id: 'SIGN', name: 'Sign', kind: ItemKind.BLOCK, targetBlock: BlockType.SIGN, color: '#F4A460', description: 'Displays clear editable messages when punched.', canSpliced: true },
  'SIGN_SEED': { id: 'SIGN_SEED', name: 'Sign Seed', kind: ItemKind.SEED, targetBlock: BlockType.SIGN, color: '#dba367', description: 'Plant instructions across rooms.', canSpliced: true },
  'BRICK': { id: 'BRICK', name: 'Brick', kind: ItemKind.BLOCK, targetBlock: BlockType.BRICK, color: '#B22222', description: 'Refined clay baking blocks.', canSpliced: true },
  'BRICK_SEED': { id: 'BRICK_SEED', name: 'Brick Seed', kind: ItemKind.SEED, targetBlock: BlockType.BRICK, color: '#cd5c5c', description: 'Spliced bricks sprout structured clay walls.', canSpliced: true },
  'GLASS': { id: 'GLASS', name: 'Glass', kind: ItemKind.BLOCK, targetBlock: BlockType.GLASS, color: '#E0FFFF', description: 'See-through shiny aesthetic barrier.', canSpliced: true },
  'GLASS_SEED': { id: 'GLASS_SEED', name: 'Glass Seed', kind: ItemKind.SEED, targetBlock: BlockType.GLASS, color: '#f0ffff', description: 'Silica clusters sprout clear glass cells.', canSpliced: true },
  'WORLD_LOCK': { id: 'WORLD_LOCK', name: 'World Lock', kind: ItemKind.BLOCK, targetBlock: BlockType.WORLD_LOCK, color: '#FFD700', description: 'Secures your entire local rooms database from external breakages!', canSpliced: false },
  'PICKAXE': { id: 'PICKAXE', name: 'Steel Pickaxe', kind: ItemKind.EQUIPMENT, targetBlock: BlockType.AIR, color: '#C0C0C0', description: 'Equipable to break blocks 50% faster!', canSpliced: false },
  'ANGEL_WINGS': { id: 'ANGEL_WINGS', name: 'Angel Wings', kind: ItemKind.EQUIPMENT, targetBlock: BlockType.AIR, color: '#FFFFFF', description: 'Equipable to jump 40% higher and slower floating speeds!', canSpliced: false },
  'SPEED_BOOTS': { id: 'SPEED_BOOTS', name: 'Mercury Boots', kind: ItemKind.EQUIPMENT, targetBlock: BlockType.AIR, color: '#4169E1', description: 'Equipable to jog 30% faster on all land surfaces!', canSpliced: false },
};

// Splicing recipe data
export const SPLICING_RECIPES: Recipe[] = [
  { id: 'R1', seedA: 'DIRT_SEED', seedB: 'CAVE_WALL_SEED', resultItemId: 'GRASS_SEED', chance: 1.0 },
  { id: 'R2', seedA: 'ROCK_SEED', seedB: 'DIRT_SEED', resultItemId: 'LAVA_SEED', chance: 0.9 },
  { id: 'R3', seedA: 'GRASS_SEED', seedB: 'ROCK_SEED', resultItemId: 'WOOD_BLOCK_SEED', chance: 0.8 },
  { id: 'R4', seedA: 'WOOD_BLOCK_SEED', seedB: 'CAVE_WALL_SEED', resultItemId: 'DOOR_SEED', chance: 0.85 },
  { id: 'R5', seedA: 'DOOR_SEED', seedB: 'ROCK_SEED', resultItemId: 'SIGN_SEED', chance: 0.9 },
  { id: 'R6', seedA: 'WOOD_BLOCK_SEED', seedB: 'LAVA_SEED', resultItemId: 'BRICK_SEED', chance: 0.75 },
  { id: 'R7', seedA: 'BRICK_SEED', seedB: 'LAVA_SEED', resultItemId: 'GLASS_SEED', chance: 0.7 },
];
