import React, { useRef, useEffect, useState } from 'react';
import { GameWorld, Player, BlockType, ITEM_DATABASE, ItemKind } from '../types.js';
import { ShieldAlert, Zap, Compass, RefreshCw, PencilLine } from 'lucide-react';

interface GameCanvasProps {
  world: GameWorld;
  localPlayer: Player;
  players: Player[];
  selectedItemCode: string | null;
  activeEquipment: string | null;
  onTileClick: (tx: number, ty: number, action: 'punch' | 'place') => void;
  onMove: (x: number, y: number, vx: number, vy: number) => void;
  onUpdateSignText: (tx: number, ty: number, text: string) => void;
  antiCheatLogs: { time: string; msg: string; type: "info" | "warn" | "block" }[];
}

export default function GameCanvas({
  world,
  localPlayer,
  players,
  selectedItemCode,
  activeEquipment,
  onTileClick,
  onMove,
  onUpdateSignText,
  antiCheatLogs
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sign editing modal inside canvas overlay
  const [editingSign, setEditingSign] = useState<{ tx: number; ty: number; currentText: string } | null>(null);
  const [signInput, setSignInput] = useState('');

  // Local physics representation for optimistic, smooth, latency-free rendering
  const localPos = useRef({ x: localPlayer.x, y: localPlayer.y, vx: 0, vy: 0, onGround: false });

  // Input states tracking keys
  const keys = useRef<Record<string, boolean>>({});

  // Screen/Camera variables
  const TILE_SIZE = 32;

  // Collision solids list
  const SOLID_BLOCKS = [
    BlockType.DIRT,
    BlockType.ROCK,
    BlockType.LAVA,
    BlockType.GRASS,
    BlockType.WOOD_BLOCK,
    BlockType.BRICK,
    BlockType.GLASS,
    BlockType.WORLD_LOCK
  ];

  function isTileSolid(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) return true; // borders are solid
    const tile = world.tiles[ty][tx];
    return SOLID_BLOCKS.includes(tile.foreground);
  }

  // Handle keys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync server snap positions when they drift too far or force corrects
  useEffect(() => {
    const dx = localPlayer.x - localPos.current.x;
    const dy = localPlayer.y - localPos.current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 3.0) {
      // Hard correction triggered by anti-cheat or login snap
      localPos.current.x = localPlayer.x;
      localPos.current.y = localPlayer.y;
      localPos.current.vx = 0;
      localPos.current.vy = 0;
    }
  }, [localPlayer.x, localPlayer.y]);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.03, (time - lastTime) / 1000); // capped to avoid huge jumps on tab switch
      lastTime = time;

      // Physics logic
      updatePhysics(dt);

      // Render game state
      drawGame();

      animationId = requestAnimationFrame(loop);
    };

    const updatePhysics = (dt: number) => {
      const pos = localPos.current;

      // Multipliers based on active equipment buffs
      let walkAcceleration = 22;
      let walkMaxSpeed = 7;
      let jumpVelocity = -12;
      let gravity = 30;

      if (activeEquipment === 'SPEED_BOOTS') {
        walkAcceleration = 32;
        walkMaxSpeed = 9.5;
      } else if (activeEquipment === 'ANGEL_WINGS') {
        jumpVelocity = -16.5; 
        gravity = 18; // low floating gravity
      }

      // 1. Horizonal input physics
      let moveDir = 0;
      if (keys.current['a'] || keys.current['arrowleft']) moveDir -= 1;
      if (keys.current['d'] || keys.current['arrowright']) moveDir += 1;

      if (moveDir !== 0) {
        pos.vx += moveDir * walkAcceleration * dt;
        pos.vx = Math.max(-walkMaxSpeed, Math.min(walkMaxSpeed, pos.vx));
      } else {
        // Friction drag
        pos.vx *= Math.max(0, 1 - 10 * dt);
      }

      // 2. Vertical Jump physics
      if ((keys.current['w'] || keys.current['arrowup'] || keys.current[' ']) && pos.onGround) {
        pos.vy = jumpVelocity;
        pos.onGround = false;
      }

      // Apply Gravity
      pos.vy += gravity * dt;
      pos.vy = Math.min(18, pos.vy); // terminal velocity

      // Predict next step positions
      let nextX = pos.x + pos.vx * dt;
      let nextY = pos.y + pos.vy * dt;

      // 3. Collision Checks (AABB resolution)
      const buffer = 0.35; // bounding box width factor around grid

      // Check vertical collisions
      pos.onGround = false;
      if (pos.vy > 0) {
        // Falling down
        if (isTileSolid(Math.floor(nextX - buffer), Math.floor(nextY + 0.95)) ||
            isTileSolid(Math.floor(nextX + buffer), Math.floor(nextY + 0.95))) {
          nextY = Math.floor(nextY);
          pos.vy = 0;
          pos.onGround = true;

          // Check if standing on Lava to inflict bounce back (and visually showcase collision hazard)
          const standingOnLeft = world.tiles[Math.floor(nextY + 0.55)]?.[Math.floor(nextX - buffer)];
          const standingOnRight = world.tiles[Math.floor(nextY + 0.55)]?.[Math.floor(nextX + buffer)];
          if (standingOnLeft?.foreground === BlockType.LAVA || standingOnRight?.foreground === BlockType.LAVA) {
            pos.vy = -10; // Lava bounce
            pos.vx = (Math.random() - 0.5) * 15;
            pos.onGround = false;
          }
        }
      } else if (pos.vy < 0) {
        // Jumping up
        if (isTileSolid(Math.floor(nextX - buffer), Math.floor(nextY)) ||
            isTileSolid(Math.floor(nextX + buffer), Math.floor(nextY))) {
          nextY = Math.floor(nextY) + 1.0;
          pos.vy = 0;
        }
      }

      // Check horizontal collisions
      if (pos.vx > 0) {
        if (isTileSolid(Math.floor(nextX + buffer), Math.floor(pos.y)) ||
            isTileSolid(Math.floor(nextX + buffer), Math.floor(pos.y + 0.9))) {
          nextX = Math.floor(nextX + buffer) - buffer - 0.05;
          pos.vx = 0;
        }
      } else if (pos.vx < 0) {
        if (isTileSolid(Math.floor(nextX - buffer), Math.floor(pos.y)) ||
            isTileSolid(Math.floor(nextX - buffer), Math.floor(pos.y + 0.9))) {
          nextX = Math.floor(nextX - buffer) + 1.0 + buffer + 0.05;
          pos.vx = 0;
        }
      }

      // Commit resolved coordinate update
      pos.x = Math.max(0.5, Math.min(world.width - 0.5, nextX));
      pos.y = Math.max(0.5, Math.min(world.height - 1.2, nextY));

      // 4. Emit position coordinate syncing server-side on meaningful changes
      const diffX = Math.abs(pos.x - localPlayer.x);
      const diffY = Math.abs(pos.y - localPlayer.y);
      if (diffX > 0.05 || diffY > 0.05) {
        onMove(pos.x, pos.y, pos.vx, pos.vy);
      }
    };

    const drawGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // 1. Draw Background sky
      ctx.fillStyle = '#10141f';
      ctx.fillRect(0, 0, cw, ch);

      // Camera Offset mapping: center layout around player
      const camX = posToCanvas(localPos.current.x) - cw / 2;
      const camY = posToCanvas(localPos.current.y) - ch / 2;

      ctx.save();
      ctx.translate(-camX, -camY);

      // 2. Render background dark cave wall indicators first
      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          const tile = world.tiles[y][x];
          if (tile.background !== BlockType.AIR) {
            ctx.fillStyle = '#262d3d'; // Caves background block wall
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#1d2330';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // 3. Draw Grid lines (atmospheric, Growtopia styled)
      ctx.strokeStyle = 'rgba(74, 85, 104, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= world.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, world.height * TILE_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= world.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(world.width * TILE_SIZE, y * TILE_SIZE);
        ctx.stroke();
      }

      // 4. Render Foreground World Tiles
      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          const tile = world.tiles[y][x];

          if (tile.foreground !== BlockType.AIR) {
            // Pick corresponding item color
            const itemConf = Object.values(ITEM_DATABASE).find(i => i.targetBlock === tile.foreground);
            const color = itemConf ? itemConf.color : '#555555';

            ctx.fillStyle = color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Give subtle texture effects on custom shapes
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.strokeRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);

            // Door handle detail
            if (tile.foreground === BlockType.DOOR) {
              ctx.fillStyle = '#ffd700'; // gold handle knob
              ctx.fillRect(x * TILE_SIZE + TILE_SIZE - 10, y * TILE_SIZE + TILE_SIZE / 2 - 2, 4, 4);
            }

            // World Lock center glow
            if (tile.foreground === BlockType.WORLD_LOCK) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x * TILE_SIZE + TILE_SIZE / 2 - 2, y * TILE_SIZE + TILE_SIZE / 2 - 4, 4, 8);
              ctx.strokeStyle = '#fff';
              ctx.strokeRect(x * TILE_SIZE + TILE_SIZE / 2 - 6, y * TILE_SIZE + TILE_SIZE / 2 - 6, 12, 12);
            }

            // Visual flag for lock claim territory owners
            if (tile.lockedBy) {
              ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
              ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }

          // Trees Rendering
          if (tile.tree) {
            const pct = tile.tree.growthPercent;
            const txOffset = x * TILE_SIZE + TILE_SIZE / 2;
            const tyOffset = y * TILE_SIZE + TILE_SIZE;

            // Trunk wood branch
            ctx.fillStyle = '#8B5A2B';
            const stemHeight = 8 + (pct / 100) * 16;
            const stemWidth = 3 + (pct / 100) * 4;
            ctx.fillRect(txOffset - stemWidth / 2, tyOffset - stemHeight, stemWidth, stemHeight);

            // Sprouted Leaves
            ctx.fillStyle = pct < 100 ? '#458B00' : '#228B22'; // bright green ready
            const foliageSize = 4 + (pct / 100) * 12;
            ctx.beginPath();
            ctx.arc(txOffset, tyOffset - stemHeight, foliageSize, 0, Math.PI * 2);
            ctx.fill();

            // Fruit text tip indicating item type
            if (pct >= 100) {
              ctx.fillStyle = '#FFD700'; // shining fruit glow
              ctx.fillRect(txOffset - 3, tyOffset - stemHeight - 3, 6, 6);
              
              ctx.fillStyle = '#fff';
              ctx.font = '7px monospace';
              ctx.textAlign = 'center';
              ctx.fillText("READY PUNCH", txOffset, tyOffset - stemHeight - 10);
            } else {
              ctx.fillStyle = '#aaa';
              ctx.font = '8px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`${pct}%`, txOffset, tyOffset - stemHeight - 6);
            }
          }
        }
      }

      // 5. Draw Other Connected Players
      players.forEach((p) => {
        if (p.id === localPlayer.id) return; // draw local player separately with smooth prediction coords

        const px = posToCanvas(p.x);
        const py = posToCanvas(p.y);

        // draw online remote player avatar
        drawPlayerAvatar(ctx, px, py, p.username, p.activeEquipment, false);
      });

      // 6. Draw Local Player Optimistic Avatar
      const localPx = posToCanvas(localPos.current.x);
      const localPy = posToCanvas(localPos.current.y);
      drawPlayerAvatar(ctx, localPx, localPy, localPlayer.username, activeEquipment, true);

      // 7. Render Claim Border Indicators (Yellow outline)
      const hoverTile = getHoverTileCoords(lastMouseX.current, lastMouseY.current, camX, camY);
      if (hoverTile) {
        const hTx = hoverTile.tx;
        const hTy = hoverTile.ty;
        if (hTx >= 0 && hTx < world.width && hTy >= 0 && hTy < world.height) {
          const tile = world.tiles[hTy][hTx];
          
          // distance calculation check
          const dist = Math.sqrt(Math.pow(hTx - localPos.current.x, 2) + Math.pow(hTy - localPos.current.y, 2));
          const closeEnough = dist <= 5.8;

          ctx.strokeStyle = closeEnough ? 'rgba(251, 191, 36, 0.8)' : 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(hTx * TILE_SIZE, hTy * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          // Render locked details if claimed
          if (tile.lockedBy) {
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`🔒 ${tile.lockedBy}`, hTx * TILE_SIZE + 2, hTy * TILE_SIZE - 4);
          }
        }
      }

      ctx.restore();
    };

    const drawPlayerAvatar = (
      ctx: CanvasRenderingContext2D,
      px: number,
      py: number,
      name: string,
      eq: string | null,
      isMe: boolean
    ) => {
      // Body shape rectangle
      ctx.fillStyle = isMe ? '#4f46e5' : '#f43f5e'; // Vibrant main block colors
      ctx.fillRect(px - 10, py, 20, 28);

      // Black outline for neobrutalist gaming style to sync with theme
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(px - 10, py, 20, 28);

      // Cute tiny face eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + 2, py + 5, 4, 4); // right eye
      ctx.fillRect(px - 6, py + 5, 4, 4); // left eye
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 3, py + 6, 2, 2);
      ctx.fillRect(px - 5, py + 6, 2, 2);

      // Cosmetic accessories rendering
      if (eq === 'PICKAXE') {
        ctx.fillStyle = '#c0c0c0'; // steel
        ctx.fillRect(px + 8, py + 12, 10, 4); // pick steel
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(px + 10, py + 6, 2, 12); // wooden staff
      } else if (eq === 'ANGEL_WINGS') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // glowing semi transparent angel wings
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Left wing
        ctx.moveTo(px - 10, py + 10);
        ctx.lineTo(px - 22, py + 4);
        ctx.lineTo(px - 18, py + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(px + 10, py + 10);
        ctx.lineTo(px + 22, py + 4);
        ctx.lineTo(px + 18, py + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (eq === 'SPEED_BOOTS') {
        ctx.fillStyle = '#FFD700'; // golden flashing speed trails around shoes
        ctx.fillRect(px - 12, py + 26, 7, 3);
        ctx.fillRect(px + 5, py + 26, 7, 3);
      }

      // Username text tag overlay with high-contrast text label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      
      let finalName = name;
      if (isMe) finalName = `★ ${name}`;

      // Draw neat backing tag
      const textWidth = ctx.measureText(finalName).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(px - textWidth / 2 - 4, py - 18, textWidth + 8, 14);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - textWidth / 2 - 4, py - 18, textWidth + 8, 14);

      ctx.fillStyle = '#fff';
      ctx.fillText(finalName, px, py - 8);
    };

    const posToCanvas = (gridVal: number) => {
      return gridVal * TILE_SIZE;
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [world, players, localPlayer, selectedItemCode, activeEquipment]);

  // Tracking mouse coordinates
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastMouseX.current = e.clientX - rect.left;
    lastMouseY.current = e.clientY - rect.top;
  };

  const getHoverTileCoords = (mx: number, my: number, camX: number, camY: number) => {
    const gridX = Math.floor((mx + camX) / TILE_SIZE);
    const gridY = Math.floor((my + camY) / TILE_SIZE);
    return { tx: gridX, ty: gridY };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const camX = posToCanvas(localPos.current.x) - canvas.width / 2;
    const camY = posToCanvas(localPos.current.y) - canvas.height / 2;

    const { tx, ty } = getHoverTileCoords(mx, my, camX, camY);

    if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) return;

    const tile = world.tiles[ty][tx];

    // Left click breaks block (Punch) if no builder item selected, OR builds item if selected
    // If we click on a Sign Foreground block, trigger sign editing overlay text modal
    if (tile.foreground === BlockType.SIGN && e.button === 0) {
      setEditingSign({ tx, ty, currentText: tile.signText || '' });
      setSignInput(tile.signText || '');
      return;
    }

    if (selectedItemCode) {
      onTileClick(tx, ty, 'place');
    } else {
      onTileClick(tx, ty, 'punch');
    }
  };

  const posToCanvas = (gridVal: number) => {
    return gridVal * TILE_SIZE;
  };

  const handleSaveSign = () => {
    if (editingSign) {
      onUpdateSignText(editingSign.tx, editingSign.ty, signInput.trim());
      setEditingSign(null);
    }
  };

  return (
    <div id="canvas-console-row" className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      
      {/* Visual Canvas Simulator */}
      <div id="game-canvas-wrapper" className="xl:col-span-8 flex flex-col relative bg-[#131722] border-4 border-black rounded-[32px] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[25rem]">
        {/* Absolute top dashboard details overlay */}
        <div className="absolute top-3.5 left-3.5 flex gap-2 pointer-events-none text-[10px] font-mono z-10 flex-wrap">
          <div className="bg-[#FDE68A] text-[#1E1B4B] border-2 border-black px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
            <Compass className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Map Grid: Live Cavity Cavern</span>
          </div>

          {activeEquipment && (
            <div className="bg-[#BAE6FD] text-[#1E1B4B] border-2 border-black px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
              <span>BUFF: {activeEquipment.replace("_", " ")} ACTIVE</span>
            </div>
          )}
        </div>

        {/* Canvas panel render */}
        <canvas
          ref={canvasRef}
          width={600}
          height={380}
          onMouseMove={handleMouseMove}
          onMouseDown={handleCanvasClick}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Sign edit popup overlay */}
        {editingSign && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="bg-white border-4 border-black rounded-[28px] p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-[#1E1B4B]">
              <h4 className="text-xs font-black uppercase tracking-tight text-[#1E1B4B] mb-1 flex items-center gap-1.5">
                <PencilLine className="w-4 h-4 text-[#4F46E5]" />
                📝 Edit Sign Post text
              </h4>
              <p className="text-[11px] font-bold text-slate-600 mb-3.5">Signs display custom welcome boards or warnings across lobby rooms.</p>
              
              <textarea
                value={signInput}
                onChange={(e) => setSignInput(e.target.value)}
                maxLength={80}
                rows={3}
                className="w-full bg-slate-50 border-2 border-black rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] font-black mb-4"
                placeholder="Type welcome messages..."
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingSign(null)}
                  className="bg-white border-2 border-black hover:bg-slate-50 text-slate-800 py-1.5 px-3.5 rounded-xl text-xxs font-black cursor-pointer active:scale-95 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSign}
                  className="bg-[#10B981] hover:bg-[#059669] text-white py-1.5 px-4 rounded-xl text-xxs border-2 border-black font-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-95 cursor-pointer"
                >
                  Save Sign Content
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Anti-Cheat validates logs view */}
      <div id="anti-cheat-terminal" className="xl:col-span-4 bg-[#BAE6FD] border-4 border-black rounded-[32px] p-5 flex flex-col justify-between max-h-[25rem] overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h3 className="text-sm font-black uppercase text-[#1E1B4B] tracking-tight mb-1 flex items-center gap-1.5">
            <ShieldAlert className="text-[#F43F5E] w-5 h-5 fill-[#FECDD3]" />
            GrowShield Anti-Cheat Console
          </h3>
          <p className="text-[11px] font-bold text-slate-700 leading-normal mb-3">
            Authoritative check for coordinates anomalies, harvest limits, reach distances, or flight packet injections 24/7.
          </p>

          <div className="bg-white border-2 border-black rounded-[20px] p-3 space-y-2 h-[15.5rem] overflow-y-auto font-mono text-[10px] text-slate-800 font-bold scrollbar-thin shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)]">
            {antiCheatLogs.map((log, idx) => {
              let clr = "text-slate-600";
              if (log.type === "block") clr = "text-white bg-[#F43F5E] border border-black px-1.5 py-0.2 rounded font-black uppercase tracking-tight";
              else if (log.type === "warn") clr = "text-[#1E1B4B] bg-[#FDE68A] border border-black px-1.5 py-0.2 rounded uppercase tracking-tight";

              return (
                <div key={idx} className="leading-snug flex items-start gap-1">
                  <span className="text-[9px] text-slate-400 shrink-0">[{log.time}]</span>
                  <p className={clr}>{log.msg}</p>
                </div>
              );
            })}

            {antiCheatLogs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                <RefreshCw className="w-6 h-6 text-[#4F46E5] opacity-60 mb-1.5 animate-spin" />
                <span className="uppercase tracking-tight text-[10px] text-slate-500 font-black">Live feed listener waiting for logs...</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-2 px-3 bg-white border-2 border-black rounded-xl font-bold text-[9px] text-[#1E1B4B] leading-tight mt-3 uppercase tracking-tighter">
          🛡️ SYSTEM INTEGRITY STATUS: BLOCK BREAKS AND SEED YIELDS VALIDATED Authoritatively ON EACH SERVER ROW.
        </div>
      </div>

    </div>
  );
}
