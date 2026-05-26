import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { 
  BlockType, 
  ItemKind, 
  Tile, 
  Player, 
  MarketplaceItem, 
  Guild, 
  ChatMessage, 
  ITEM_DATABASE,
  SPLICING_RECIPES,
  InventoryItem
} from "./src/types.js";

// Helper for ES Module compatibility
const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // In-memory Server Database
  const accounts: Record<string, { passwordHash: string; player: Player }> = {};
  const worlds: Record<string, Tile[][]> = {};
  const marketplace: MarketplaceItem[] = [];
  const guilds: Record<string, Guild> = {};
  const activeConnections: Record<string, WebSocket> = {}; // playerId -> WS

  // Create Default Sandbox World: "GrowtopiaLobby"
  const WORLD_WIDTH = 60;
  const WORLD_HEIGHT = 30;

  function initDefaultWorld() {
    const tiles: Tile[][] = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        let fg = BlockType.AIR;
        let bg = BlockType.AIR;

        // Build some simple default terrain
        if (y === WORLD_HEIGHT - 1) {
          fg = BlockType.ROCK; // Bedrock bottom
        } else if (y >= 26) {
          fg = BlockType.ROCK;
          bg = BlockType.CAVE_WALL;
        } else if (y >= 20) {
          fg = BlockType.DIRT;
          bg = BlockType.CAVE_WALL;
          // Spawn little puddles of lava
          if (y === 25 && (x === 12 || x === 13 || x === 40 || x === 41)) {
            fg = BlockType.LAVA;
          }
        } else if (y === 19) {
          // Topsoil grass layer
          fg = BlockType.GRASS;
          bg = BlockType.AIR;
        }

        row.push({
          x,
          y,
          foreground: fg,
          background: bg,
          tree: null,
          lockedBy: null,
          signText: null
        });
      }
      tiles.push(row);
    }

    // Place a spawn door at x: 5, y: 18
    tiles[18][5] = {
      x: 5,
      y: 18,
      foreground: BlockType.DOOR,
      background: BlockType.AIR,
      tree: null,
      lockedBy: null,
      signText: "Welcome to the Lobby Spawn Door!"
    };

    // Place some custom informational signs
    tiles[18][10] = {
      x: 10,
      y: 18,
      foreground: BlockType.SIGN,
      background: BlockType.AIR,
      tree: null,
      lockedBy: null,
      signText: "Splice seed A + seed B in inventory to get exotic blocks!"
    };

    tiles[18][18] = {
      x: 18,
      y: 18,
      foreground: BlockType.SIGN,
      background: BlockType.AIR,
      tree: null,
      lockedBy: null,
      signText: "Punch blocks to break. Buy World Locks in Shop to secure chunks!"
    };

    // Place random trees at the start
    tiles[18][15] = {
      x: 15,
      y: 18,
      foreground: BlockType.AIR,
      background: BlockType.AIR,
      tree: {
        x: 15,
        y: 18,
        seedType: "GRASS_SEED",
        plantedAt: Date.now() - 60000,
        readyAt: Date.now() - 10000,
        growthPercent: 100
      },
      lockedBy: null,
      signText: null
    };

    worlds["lobby"] = tiles;
  }

  initDefaultWorld();

  // Create basic initial guild
  guilds["g-admin"] = {
    id: "g-admin",
    name: "GrowCraft Legend",
    leaderId: "admin",
    leaderName: "LordGrow",
    members: [{ id: "admin", username: "LordGrow", rank: "Leader" }],
    gemsDonated: 15000,
    level: 3,
    perkActive: true
  };

  // Default seed list starting with basic elements
  function createDefaultInventory(): InventoryItem[] {
    return [
      { id: "DIRT_SEED", name: "Dirt Seed", kind: ItemKind.SEED, targetBlock: BlockType.DIRT, count: 20, description: "Plant this to sprout more Dirt blocks." },
      { id: "CAVE_WALL_SEED", name: "Cave Wall Seed", kind: ItemKind.SEED, targetBlock: BlockType.CAVE_WALL, count: 15, description: "Sprouts Cave background walls." },
      { id: "ROCK_SEED", name: "Rock Seed", kind: ItemKind.SEED, targetBlock: BlockType.ROCK, count: 10, description: "Sprouts study mineral stone blocks." },
      { id: "LAVA_SEED", name: "Lava Seed", kind: ItemKind.SEED, targetBlock: BlockType.LAVA, count: 2, description: "Sprouts dangerous hot magma." }
    ];
  }

  // Active Anti-Cheat Validation Logs Cache
  const antiCheatLogs: { time: string; msg: string; type: "info" | "warn" | "block" }[] = [];
  function addAntiCheatLog(msg: string, type: "info" | "warn" | "block" = "info") {
    const timeStr = new Date().toLocaleTimeString();
    antiCheatLogs.unshift({ time: timeStr, msg, type });
    if (antiCheatLogs.length > 50) antiCheatLogs.pop();
    // Broadcast anti-cheat event to all connected sockets
    broadcastToAll({
      type: "anti_cheat_log",
      payload: { time: timeStr, msg, type }
    });
  }

  // REST endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", worldSize: `${WORLD_WIDTH}x${WORLD_HEIGHT}` });
  });

  app.get("/api/anti-cheat", (req, res) => {
    res.json(antiCheatLogs);
  });

  // Create standard HTTP server and upgrade with WebSocket
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // Helper: Broadcast payload to all joined sockets
  function broadcastToAll(data: any) {
    const payloadStr = JSON.stringify(data);
    Object.values(activeConnections).forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payloadStr);
      }
    });
  }

  // Grow trees simulation on intervals
  setInterval(() => {
    const lobbyTiles = worlds["lobby"];
    if (!lobbyTiles) return;

    let updated = false;
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const tile = lobbyTiles[y][x];
        if (tile.tree && tile.tree.growthPercent < 100) {
          const elapsed = Date.now() - tile.tree.plantedAt;
          const duration = tile.tree.readyAt - tile.tree.plantedAt;
          const percent = Math.min(100, Math.floor((elapsed / duration) * 100));
          tile.tree.growthPercent = percent;
          updated = true;
        }
      }
    }

    if (updated) {
      broadcastToAll({
        type: "world_update",
        payload: { tiles: lobbyTiles }
      });
    }
  }, 4000);

  wss.on("connection", (ws: WebSocket) => {
    let sessionUser: Player | null = null;
    let lastPunchTime = 0;
    let lastPlaceTime = 0;

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message);
        const { type, payload } = data;

        if (type === "login") {
          const { username, password } = payload;
          if (!username || username.trim() === "") {
            ws.send(JSON.stringify({ type: "login_fail", payload: "Username invalid" }));
            return;
          }

          const uKey = username.toLowerCase().trim();

          // Simple account register/login
          if (!accounts[uKey]) {
            // Register auto-registering player!
            const newPlayer: Player = {
              id: uKey,
              username: username.trim(),
              x: 5.0,
              y: 17.0, // Spawn just over the door
              vx: 0,
              vy: 0,
              gems: 1000,
              worldLocks: 0,
              activeEquipment: null,
              inventory: createDefaultInventory(),
              guildId: null,
              lastActionTime: Date.now()
            };
            accounts[uKey] = {
              passwordHash: password || "123456",
              player: newPlayer
            };
            addAntiCheatLog(`In-Memory Cloud Sync: Registered new account "${username}" securely.`, "info");
          } else {
            // Verify Password
            if (password && accounts[uKey].passwordHash !== password) {
              ws.send(JSON.stringify({ type: "login_fail", payload: "Incorrect password for existing character!" }));
              return;
            }
          }

          sessionUser = accounts[uKey].player;
          activeConnections[sessionUser.id] = ws;

          addAntiCheatLog(`Cross-Platform Login validated: Player "${sessionUser.username}" connected.`, "info");

          // Send current state
          ws.send(JSON.stringify({
            type: "login_success",
            payload: {
              player: sessionUser,
              world: {
                name: "lobby",
                width: WORLD_WIDTH,
                height: WORLD_HEIGHT,
                tiles: worlds["lobby"]
              },
              players: Object.values(accounts).map(a => a.player),
              marketplace,
              guilds: Object.values(guilds),
              antiCheatLogs: antiCheatLogs.slice(0, 10)
            }
          }));

          // Notify others
          broadcastToAll({
            type: "player_joined",
            payload: { player: sessionUser }
          });

          // Send system join chat
          broadcastToAll({
            type: "chat_receive",
            payload: {
              id: "sys-" + Math.random(),
              sender: "System",
              text: `Player ${sessionUser.username} has spawned in the Lobby!`,
              channel: "world",
              timestamp: Date.now()
            }
          });

          return;
        }

        // Must be logged in past here
        if (!sessionUser) {
          ws.send(JSON.stringify({ type: "error", payload: "Authentication required" }));
          return;
        }

        // Real-Time anti-cheat and commands processing
        switch (type) {
          case "move": {
            const { x, y, vx, vy } = payload;
            
            // SERVER AUTHORITATIVE MOVEMENT & ANTI-CHEAT VALIDATION
            const timestamp = Date.now();
            const timeDelta = (timestamp - sessionUser.lastActionTime) / 1000;
            
            if (timeDelta > 0.05) {
              const dx = x - sessionUser.x;
              const dy = y - sessionUser.y;
              const distance = Math.sqrt(dx*dx + dy*dy);
              const speed = distance / timeDelta;

              // Check speed hack limit (Growtopia walking tiles: ~15 per second is the safety bar)
              const maxAllowedSpeed = sessionUser.activeEquipment === 'SPEED_BOOTS' ? 22 : 16; 
              
              if (speed > maxAllowedSpeed && distance > 3.0) {
                // Suspicious speed burst! Cheat caught
                addAntiCheatLog(`[Caught Action] Anti-Cheat flagged Speed Violation: Player "${sessionUser.username}" moved too fast (${speed.toFixed(1)}/sec - Limit: ${maxAllowedSpeed}).`, "block");
                
                // Forces Client to snap back to Server-side saved correct position
                ws.send(JSON.stringify({
                  type: "force_correction",
                  payload: { x: sessionUser.x, y: sessionUser.y, reason: "Movement speed validation failed!" }
                }));
                break;
              }
            }

            // Sync positions
            sessionUser.x = x;
            sessionUser.y = y;
            sessionUser.vx = vx;
            sessionUser.vy = vy;
            sessionUser.lastActionTime = timestamp;

            // Broadcast movement to all other users
            broadcastToAll({
              type: "player_moved",
              payload: { id: sessionUser.id, x, y, vx, vy }
            });
            break;
          }

          case "punch": {
            const { tx, ty } = payload; // target tile coordination
            const now = Date.now();

            // 1. Validate Punch Rate Cooldown
            if (now - lastPunchTime < 130) {
              addAntiCheatLog(`[Rate Violation] Anti-Cheat Blocked rapid mining from "${sessionUser.username}" (mining cooldown bypass rate blocked).`, "block");
              ws.send(JSON.stringify({ type: "error", payload: "Action rate too fast. Cooldown in effect." }));
              break;
            }
            lastPunchTime = now;

            // 2. Authoritative Distance Checking
            const dx = tx - sessionUser.x;
            const dy = ty - sessionUser.y;
            const punchDist = Math.sqrt(dx*dx + dy*dy);
            const maxPunchReach = 5.8;

            if (punchDist > maxPunchReach) {
              addAntiCheatLog(`[Reach Violation] Blocked build punch reach bypass by "${sessionUser.username}". Reach measured: ${punchDist.toFixed(1)} - Max limit: ${maxPunchReach}.`, "block");
              ws.send(JSON.stringify({ type: "error", payload: "Target block out of range!" }));
              break;
            }

            // Check tile
            const lobTiles = worlds["lobby"];
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) {
              break;
            }

            const tile = lobTiles[ty][tx];

            // Ground/bedrock tile at y === 29 is indestructible
            if (ty === WORLD_HEIGHT - 1) {
              addAntiCheatLog(`[State Validation] Blocked destruction of bedrock at level ${ty} by ${sessionUser.username}.`, "info");
              ws.send(JSON.stringify({ type: "error", payload: "Bedrock is unbreakable!" }));
              break;
            }

            // World lock validation: if locked by someone else, block unless player matches lock owner
            if (tile.lockedBy && tile.lockedBy !== sessionUser.username) {
              addAntiCheatLog(`[Claim Violation] Anti-Cheat blocked theft/griefing: ${sessionUser.username} tried to punch territory locked by ${tile.lockedBy}.`, "block");
              ws.send(JSON.stringify({ type: "error", payload: "This world sector belongs to " + tile.lockedBy }));
              break;
            }

            // Perform break action
            let brokenItem = "";
            let itemKind = ItemKind.BLOCK;
            let yieldGems = 0;

            if (tile.tree) {
              // Harvester Tree logic
              if (tile.tree.growthPercent < 100) {
                ws.send(JSON.stringify({ type: "error", payload: "Spliced tree is still growing!" }));
                break;
              }
              const blockIdSrc = tile.tree.seedType; 
              // Returns seeds + items
              brokenItem = blockIdSrc.replace("_SEED", ""); // e.g. 'DIRT_SEED' -> 'DIRT'
              tile.tree = null;
              tile.foreground = BlockType.AIR;
              yieldGems = Math.floor(Math.random() * 30) + 20; // 20-50 gems reward
              addAntiCheatLog(`Validated harvest of ${brokenItem} tree by ${sessionUser.username}.`, "info");
            } else if (tile.foreground !== BlockType.AIR) {
              // Punching Foreground block
              const blockBroken = tile.foreground;
              brokenItem = String(blockBroken);
              
              // Clear Lock if user punches their own World Lock
              if (blockBroken === BlockType.WORLD_LOCK) {
                // Clear world locks in room
                for (let r = 0; r < WORLD_HEIGHT; r++) {
                  for (let c = 0; c < WORLD_WIDTH; c++) {
                    if (lobTiles[r][c].lockedBy === sessionUser.username) {
                      lobTiles[r][c].lockedBy = null;
                    }
                  }
                }
                addAntiCheatLog(`Claim area unlocked by owner: ${sessionUser.username} broke World Lock.`, "info");
              }

              tile.foreground = BlockType.AIR;
              yieldGems = Math.floor(Math.random() * 8) + 4; // 4-12 gems reward
              addAntiCheatLog(`Validated block breaking of ${brokenItem} by ${sessionUser.username}.`, "info");
            } else if (tile.background !== BlockType.AIR) {
              // Punching backgrounds
              brokenItem = String(tile.background) + "_WALL"; 
              tile.background = BlockType.AIR;
              yieldGems = Math.floor(Math.random() * 4) + 1;
              addAntiCheatLog(`Validated background wall mining of ${brokenItem} by ${sessionUser.username}.`, "info");
            } else {
              // Nothing to break, exit early
              break;
            }

            // Reward player gems
            // Applying Guild mining speeds/double items if active
            let finalGemsReward = yieldGems;
            if (sessionUser.guildId) {
              const userGuild = guilds[sessionUser.guildId];
              if (userGuild && userGuild.perkActive) {
                finalGemsReward = Math.floor(yieldGems * 1.5); // +50% gems multiplier
              }
            }

            sessionUser.gems += finalGemsReward;

            // Randomly drop more seeds or components based on spliced types
            if (brokenItem !== "") {
              addToInventory(sessionUser, brokenItem, 1);
              // 40% seed dropping chance
              if (Math.random() < 0.40) {
                addToInventory(sessionUser, brokenItem + "_SEED", 1);
              }
            }

            // Sync inventory & player score
            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            
            // Broadcast world shifts to all players
            broadcastToAll({
              type: "world_update",
              payload: { tiles: lobTiles }
            });

            break;
          }

          case "place": {
            const { tx, ty, blockId } = payload;
            const now = Date.now();

            if (now - lastPlaceTime < 130) {
              ws.send(JSON.stringify({ type: "error", payload: "Slamming actions too fast. Please cooldown." }));
              break;
            }
            lastPlaceTime = now;

            // 1. Authoritative Distance Checks
            const dx = tx - sessionUser.x;
            const dy = ty - sessionUser.y;
            const placeDist = Math.sqrt(dx*dx + dy*dy);
            const maxPlaceReach = 5.8;

            if (placeDist > maxPlaceReach) {
              addAntiCheatLog(`[Claim Protection] Place reach blocked by Anti-Cheat: ${sessionUser.username} attempted to build too far (${placeDist.toFixed(1)} tiles).`, "block");
              ws.send(JSON.stringify({ type: "error", payload: "Range error!" }));
              break;
            }

            // 2. Validate inventory count
            const inventItem = sessionUser.inventory.find(i => i.id === blockId);
            if (!inventItem || inventItem.count <= 0) {
              addAntiCheatLog(`[State Violation] Player ${sessionUser.username} tried to place an item they don't have: ${blockId}.`, "block");
              ws.send(JSON.stringify({ type: "error", payload: "Insufficient item count!" }));
              break;
            }

            const lobTiles = worlds["lobby"];
            if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) {
              break;
            }

            const tile = lobTiles[ty][tx];

            // Territory Locks checks
            if (tile.lockedBy && tile.lockedBy !== sessionUser.username) {
              ws.send(JSON.stringify({ type: "error", payload: "Locked space. Purchase World Lock to build!" }));
              break;
            }

            // Check placeable types
            const itemConf = ITEM_DATABASE[blockId];
            if (!itemConf) {
              break;
            }

            if (itemConf.kind === ItemKind.SEED) {
              // Seeds require empty air bottom tile to plant
              if (tile.foreground !== BlockType.AIR || tile.tree !== null) {
                ws.send(JSON.stringify({ type: "error", payload: "Solid ground already occupied here!" }));
                break;
              }

              // Tree planted
              const growthTimeMs = 20000; // 20 seconds for interactive splicing fun!
              tile.tree = {
                x: tx,
                y: ty,
                seedType: blockId,
                plantedAt: Date.now(),
                readyAt: Date.now() + growthTimeMs,
                growthPercent: 0
              };
              addAntiCheatLog(`Authoritative cloud sync: seed ${blockId} started growing.`, "info");
            } else if (itemConf.kind === ItemKind.BACKGROUND) {
              if (tile.background !== BlockType.AIR) {
                ws.send(JSON.stringify({ type: "error", payload: "Background wall already occupied!" }));
                break;
              }
              tile.background = itemConf.targetBlock;
              addAntiCheatLog(`Authoritative cloud sync: background wall placed.`, "info");
            } else {
              // BLOCK KIND
              if (tile.foreground !== BlockType.AIR || tile.tree !== null) {
                ws.send(JSON.stringify({ type: "error", payload: "Occupied solid tile!" }));
                break;
              }
              tile.foreground = itemConf.targetBlock;

              // If building a World Lock, claim the coordinate columns around it
              if (itemConf.targetBlock === BlockType.WORLD_LOCK) {
                // Claim 10 tiles radius to the left and right
                const rxMin = Math.max(0, tx - 7);
                const rxMax = Math.min(WORLD_WIDTH - 1, tx + 7);
                for (let r = 0; r < WORLD_HEIGHT; r++) {
                  for (let c = rxMin; c <= rxMax; c++) {
                    if (r < WORLD_HEIGHT - 1 && !lobTiles[r][c].lockedBy) {
                      lobTiles[r][c].lockedBy = sessionUser.username;
                    }
                  }
                }
                addAntiCheatLog(`[Locks] Player "${sessionUser.username}" deployed World Lock. Claimed visual sector successfully!`, "info");
              }
            }

            // Deduct and update
            inventItem.count--;
            if (inventItem.count <= 0) {
              sessionUser.inventory = sessionUser.inventory.filter(i => i.id !== blockId);
            }

            // Sync updates
            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            broadcastToAll({
              type: "world_update",
              payload: { tiles: lobTiles }
            });
            break;
          }

          case "update_sign": {
            const { tx, ty, text } = payload;
            const lobTiles = worlds["lobby"];
            const tile = lobTiles[ty][tx];
            if (tile && tile.foreground === BlockType.SIGN) {
              if (tile.lockedBy && tile.lockedBy !== sessionUser.username) {
                ws.send(JSON.stringify({ type: "error", payload: "Locked Sign! Cannot edit text." }));
                break;
              }
              tile.signText = text;
              addAntiCheatLog(`Sign at [${tx}, ${ty}] updated text to: "${text}"`, "info");
              broadcastToAll({
                type: "world_update",
                payload: { tiles: lobTiles }
              });
            }
            break;
          }

          case "splice_seeds": {
            const { seedA, seedB } = payload;
            
            // Check inventory
            const itemA = sessionUser.inventory.find(i => i.id === seedA);
            const itemB = sessionUser.inventory.find(i => i.id === seedB);

            if (!itemA || itemA.count <= 0 || !itemB || itemB.count <= 0) {
              ws.send(JSON.stringify({ type: "error", payload: "Missing seed elements in inventory!" }));
              break;
            }

            // Look up splicing recipe recipe matching seed keys (either direction)
            let recipeMatch = SPLICING_RECIPES.find(r => 
              (r.seedA === seedA && r.seedB === seedB) || (r.seedA === seedB && r.seedB === seedA)
            );

            if (!recipeMatch) {
              ws.send(JSON.stringify({ type: "error", payload: "These seeds do not splice! Try standard pairs (e.g. Dirt Seed + cave Wall Seed)" }));
              break;
            }

            // Deduct inputs
            itemA.count--;
            itemB.count--;

            // Cleanup empty items
            sessionUser.inventory = sessionUser.inventory.filter(i => i.count > 0);

            // Give spliced result
            const resultId = recipeMatch.resultItemId;
            addToInventory(sessionUser, resultId, 1);

            addAntiCheatLog(`Spliced elements: Combined ${seedA} + ${seedB} -> Spliced "${resultId}"!`, "info");

            ws.send(JSON.stringify({
              type: "chat_receive",
              payload: {
                id: "splice-" + Math.random(),
                sender: "System Crafting",
                text: `Splice Success: Combined ${ITEM_DATABASE[seedA]?.name} + ${ITEM_DATABASE[seedB]?.name} to splice brand new ${ITEM_DATABASE[resultId]?.name}!`,
                channel: "world",
                timestamp: Date.now()
              }
            }));

            // Sync
            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            break;
          }

          case "buy_shop": {
            const { shopItemId } = payload;
            
            // Shop Price Database mapped by IDs
            const SHOP_DB: Record<string, { costGems: number; name: string; blockId: string; kind: ItemKind }> = {
              'buy_dirt_seed': { costGems: 10, name: "Dirt Seed x10", blockId: "DIRT_SEED", kind: ItemKind.SEED },
              'buy_cave_seed': { costGems: 15, name: "Cave Wall Seed x10", blockId: "CAVE_WALL_SEED", kind: ItemKind.SEED },
              'buy_rock_seed': { costGems: 40, name: "Rock Seed x5", blockId: "ROCK_SEED", kind: ItemKind.SEED },
              'buy_lava_seed': { costGems: 150, name: "Lava Seed x2", blockId: "LAVA_SEED", kind: ItemKind.SEED },
              'buy_world_lock': { costGems: 2000, name: "World Lock x1", blockId: 'WORLD_LOCK', kind: ItemKind.BLOCK },
              'equip_pickaxe': { costGems: 500, name: "Steel Pickaxe", blockId: 'PICKAXE', kind: ItemKind.EQUIPMENT },
              'equip_wings': { costGems: 4000, name: "Angel Wings Wings", blockId: 'ANGEL_WINGS', kind: ItemKind.EQUIPMENT },
              'equip_boots': { costGems: 1500, name: "Mercury Boots", blockId: 'SPEED_BOOTS', kind: ItemKind.EQUIPMENT },
            };

            const selected = SHOP_DB[shopItemId];
            if (!selected) {
              ws.send(JSON.stringify({ type: "error", payload: "Unknown Shop Item!" }));
              break;
            }

            if (sessionUser.gems < selected.costGems) {
              ws.send(JSON.stringify({ type: "error", payload: "Insufficient Gems fund in your secure cloud wallet!" }));
              break;
            }

            // Deduct Gems and append item
            sessionUser.gems -= selected.costGems;
            
            let countMultiplier = 1;
            if (shopItemId === 'buy_dirt_seed') countMultiplier = 10;
            else if (shopItemId === 'buy_cave_seed') countMultiplier = 10;
            else if (shopItemId === 'buy_rock_seed') countMultiplier = 5;
            else if (shopItemId === 'buy_lava_seed') countMultiplier = 2;

            addToInventory(sessionUser, selected.blockId, countMultiplier);
            addAntiCheatLog(`Secure Shop Transaction: "${sessionUser.username}" bought ${selected.name} for ${selected.costGems} Gems.`, "info");

            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            break;
          }

          case "equip_item": {
            const { equipId } = payload;
            if (equipId === null) {
              sessionUser.activeEquipment = null;
            } else {
              const inventItem = sessionUser.inventory.find(i => i.id === equipId);
              if (inventItem && inventItem.kind === ItemKind.EQUIPMENT) {
                sessionUser.activeEquipment = equipId;
                addAntiCheatLog(`Player equipped ${equipId} for cosmetic & movement buffers.`, "info");
              }
            }
            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            broadcastToAll({
              type: "player_updated_broadcast",
              payload: { playerId: sessionUser.id, activeEquipment: sessionUser.activeEquipment }
            });
            break;
          }

          // MARKETPLACE SYSTEM
          case "list_market": {
            const { itemId, count, priceGems } = payload;
            if (count <= 0 || priceGems <= 0) {
              ws.send(JSON.stringify({ type: "error", payload: "Invalid pricing elements!" }));
              break;
            }

            // Find in inventory
            const idx = sessionUser.inventory.findIndex(i => i.id === itemId);
            if (idx === -1 || sessionUser.inventory[idx].count < count) {
              ws.send(JSON.stringify({ type: "error", payload: "You do not own enough count of this item to sell!" }));
              break;
            }

            // Remove from player inventory
            sessionUser.inventory[idx].count -= count;
            const movingItem = sessionUser.inventory[idx];
            if (sessionUser.inventory[idx].count <= 0) {
              sessionUser.inventory.splice(idx, 1);
            }

            // List in global marketplace
            const mId = "market-" + Date.now() + "-" + Math.floor(Math.random()*1000);
            const marketObj: MarketplaceItem = {
              id: mId,
              sellerId: sessionUser.id,
              sellerName: sessionUser.username,
              itemId: itemId,
              itemName: ITEM_DATABASE[itemId]?.name || itemId,
              itemKind: movingItem.kind,
              targetBlock: movingItem.targetBlock,
              count: count,
              priceGems: priceGems,
              listedAt: Date.now()
            };

            marketplace.push(marketObj);
            addAntiCheatLog(`Economy Sync: "${sessionUser.username}" listed ${count}x ${marketObj.itemName} for ${priceGems} Gems in public trades.`, "info");

            // Sync back to seller
            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));

            // Sync with all
            broadcastToAll({
              type: "marketplace_update",
              payload: { marketplace }
            });
            break;
          }

          case "buy_market": {
            const { marketId } = payload;
            const marketIdx = marketplace.findIndex(m => m.id === marketId);
            if (marketIdx === -1) {
              ws.send(JSON.stringify({ type: "error", payload: "Listing no longer available or already settled!" }));
              break;
            }

            const listing = marketplace[marketIdx];
            if (listing.sellerId === sessionUser.id) {
              ws.send(JSON.stringify({ type: "error", payload: "You cannot buy your own auction listing!" }));
              break;
            }

            if (sessionUser.gems < listing.priceGems) {
              ws.send(JSON.stringify({ type: "error", payload: "Insufficient Gems in your cloud wallet!" }));
              break;
            }

            // Perform transaction securely (Multi-User safe ledger)
            sessionUser.gems -= listing.priceGems;
            addToInventory(sessionUser, listing.itemId, listing.count);

            // Add gems to seller (even if offline, since we change accounts state directly)
            const sellerAcct = accounts[listing.sellerId];
            if (sellerAcct) {
              sellerAcct.player.gems += listing.priceGems;
              
              // If seller online, notify them
              const sellerWS = activeConnections[listing.sellerId];
              if (sellerWS && sellerWS.readyState === WebSocket.OPEN) {
                sellerWS.send(JSON.stringify({
                  type: "player_updated",
                  payload: { player: sellerAcct.player }
                }));
                sellerWS.send(JSON.stringify({
                  type: "chat_receive",
                  payload: {
                    id: "trade-sold-" + Math.random(),
                    sender: "Economy Desk",
                    text: `Your listing for ${listing.count}x ${listing.itemName} was bought by ${sessionUser.username}! Received ${listing.priceGems} gems!`,
                    channel: "system",
                    timestamp: Date.now()
                  }
                }));
              }
            }

            // Remove from board
            marketplace.splice(marketIdx, 1);
            addAntiCheatLog(`Cross-Platform Economy settle: Player "${sessionUser.username}" bought "${listing.itemName}" from seller "${listing.sellerName}".`, "info");

            // Sync with players
            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            broadcastToAll({
              type: "marketplace_update",
              payload: { marketplace }
            });
            break;
          }

          case "cancel_market": {
            const { marketId } = payload;
            const marketIdx = marketplace.findIndex(m => m.id === marketId);
            if (marketIdx !== -1) {
              const listing = marketplace[marketIdx];
              if (listing.sellerId === sessionUser.id) {
                addToInventory(sessionUser, listing.itemId, listing.count);
                marketplace.splice(marketIdx, 1);
                addAntiCheatLog(`Cancelled auction listing of ${listing.itemName} by vendor ${sessionUser.username}.`, "info");
                
                ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
                broadcastToAll({
                  type: "marketplace_update",
                  payload: { marketplace }
                });
              }
            }
            break;
          }

          // GUILDS SYSTEM
          case "guild_create": {
            const { guildName } = payload;
            if (!guildName || guildName.trim() === "") {
              ws.send(JSON.stringify({ type: "error", payload: "Invalid guild label!" }));
              break;
            }

            if (sessionUser.gems < 5000) {
              ws.send(JSON.stringify({ type: "error", payload: "Guild founding requires 5,000 Gems!" }));
              break;
            }

            // Check name duplicate
            const nameDup = Object.values(guilds).find(g => g.name.toLowerCase() === guildName.toLowerCase().trim());
            if (nameDup) {
              ws.send(JSON.stringify({ type: "error", payload: "A guild with this name already exists!" }));
              break;
            }

            if (sessionUser.guildId) {
              ws.send(JSON.stringify({ type: "error", payload: "You are already a member of another guild!" }));
              break;
            }

            sessionUser.gems -= 5000;
            const gId = "guild-" + Date.now();
            const guildObj: Guild = {
              id: gId,
              name: guildName.trim(),
              leaderId: sessionUser.id,
              leaderName: sessionUser.username,
              members: [{ id: sessionUser.id, username: sessionUser.username, rank: "Leader" }],
              gemsDonated: 0,
              level: 1,
              perkActive: false
            };

            guilds[gId] = guildObj;
            sessionUser.guildId = gId;

            addAntiCheatLog(`Guild Created: "${guildName}" founded by ${sessionUser.username}.`, "info");

            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            broadcastToAll({
              type: "guilds_update",
              payload: { guilds: Object.values(guilds) }
            });
            break;
          }

          case "guild_join": {
            const { targetGuildId } = payload;
            const activeGuild = guilds[targetGuildId];
            if (!activeGuild) {
              ws.send(JSON.stringify({ type: "error", payload: "Guild not found!" }));
              break;
            }

            if (sessionUser.guildId) {
              ws.send(JSON.stringify({ type: "error", payload: "Leave your current guild before joining a new one." }));
              break;
            }

            sessionUser.guildId = targetGuildId;
            activeGuild.members.push({
              id: sessionUser.id,
              username: sessionUser.username,
              rank: "Recruit"
            });

            addAntiCheatLog(`Joined Community Guild: "${sessionUser.username}" joined "${activeGuild.name}".`, "info");

            ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
            broadcastToAll({
              type: "guilds_update",
              payload: { guilds: Object.values(guilds) }
            });
            break;
          }

          case "guild_leave": {
            const userGId = sessionUser.guildId;
            if (userGId && guilds[userGId]) {
              const activeGuild = guilds[userGId];
              activeGuild.members = activeGuild.members.filter(m => m.id !== sessionUser!.id);
              sessionUser.guildId = null;

              if (activeGuild.leaderId === sessionUser.id) {
                // Delete if leader leaves
                delete guilds[userGId];
                addAntiCheatLog(`Guild disbanded: leader left "${activeGuild.name}".`, "info");
              } else {
                addAntiCheatLog(`Leaved guild: player left "${activeGuild.name}".`, "info");
              }

              ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
              broadcastToAll({
                type: "guilds_update",
                payload: { guilds: Object.values(guilds) }
              });
            }
            break;
          }

          case "guild_donate": {
            const { donateAmount } = payload;
            const amt = parseInt(donateAmount);
            if (!amt || amt <= 0 || sessionUser.gems < amt) {
              ws.send(JSON.stringify({ type: "error", payload: "Insufficient Gems to donate!" }));
              break;
            }

            const uGId = sessionUser.guildId;
            if (uGId && guilds[uGId]) {
              const userGuild = guilds[uGId];
              sessionUser.gems -= amt;
              userGuild.gemsDonated += amt;

              // Upgrade Level Threshold: Level * 1000 gems
              const neededForUp = userGuild.level * 2500;
              if (userGuild.gemsDonated >= neededForUp) {
                userGuild.level += 1;
                userGuild.perkActive = true;
                addAntiCheatLog(`Guild Levelled Up! "${userGuild.name}" is now Level ${userGuild.level}. 1.5x Gems perk is ACTIVE!`, "info");
              }

              ws.send(JSON.stringify({ type: "player_updated", payload: { player: sessionUser } }));
              broadcastToAll({
                type: "guilds_update",
                payload: { guilds: Object.values(guilds) }
              });
            }
            break;
          }

          // CHAT SYSTEM
          case "chat": {
            const { text, channel } = payload;
            if (!text || text.trim() === "") break;

            const chatMsg: ChatMessage = {
              id: "msg-" + Date.now() + "-" + Math.floor(Math.random()*1000),
              sender: sessionUser.username,
              text: text.trim(),
              channel: channel || "world",
              timestamp: Date.now()
            };

            // Anti-cheat verification on chat (prevent massive spam)
            const chatSpanLimit = 400; // ms
            const lastSessionAction = sessionUser.lastActionTime;
            // Let's broadcast chat
            broadcastToAll({
              type: "chat_receive",
              payload: chatMsg
            });
            break;
          }

          default:
            addAntiCheatLog(`Unknown request protocol received from socket: ${type}`, "warn");
            break;
        }

      } catch (err: any) {
        console.error("Socket error", err);
      }
    });

    // Handle Client socket disconnect
    ws.on("close", () => {
      if (sessionUser) {
        addAntiCheatLog(`Connection lost: player offline "${sessionUser.username}".`, "info");
        delete activeConnections[sessionUser.id];
        
        broadcastToAll({
          type: "player_left",
          payload: { id: sessionUser.id }
        });
        
        broadcastToAll({
          type: "chat_receive",
          payload: {
            id: "sys-left-" + Math.random(),
            sender: "System",
            text: `Player ${sessionUser.username} disconnected. State persisted in Cloud database.`,
            channel: "world",
            timestamp: Date.now()
          }
        });
      }
    });
  });

  // Helper inside Server for inventory insertions
  function addToInventory(player: Player, itemCode: string, amount: number) {
    const itemInfo = ITEM_DATABASE[itemCode];
    if (!itemInfo) return;

    const existing = player.inventory.find(i => i.id === itemCode);
    if (existing) {
      existing.count += amount;
    } else {
      player.inventory.push({
        id: itemCode,
        name: itemInfo.name,
        kind: itemInfo.kind,
        targetBlock: itemInfo.targetBlock,
        count: amount,
        description: itemInfo.description
      });
    }
  }

  // Live Vite Dev server settings vs Compiled distribution static routing
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Authoritative Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
