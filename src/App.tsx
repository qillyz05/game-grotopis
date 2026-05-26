import React, { useEffect, useRef, useState } from 'react';
import { 
  Player, 
  GameWorld, 
  MarketplaceItem, 
  Guild, 
  ChatMessage, 
  BlockType,
  ItemKind 
} from './types.js';
import LoginScreen from './components/LoginScreen.js';
import GameCanvas from './components/GameCanvas.js';
import ActiveInventory from './components/ActiveInventory.js';
import ShopMarketplace from './components/ShopMarketplace.js';
import GuildChat from './components/GuildChat.js';
import { Sparkles, HelpCircle, Laptop, Landmark, ShieldAlert, Star } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Server-Synchronized States
  const [player, setPlayer] = useState<Player | null>(null);
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [antiCheatLogs, setAntiCheatLogs] = useState<{ time: string; msg: string; type: "info" | "warn" | "block" }[]>([]);

  // Selection states
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket network layer
  const handleLogin = (user: string, pass: string) => {
    // Protocol-aware relative path upgrades websocket connection flawlessly under proxies
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      // Send login message
      socket.send(JSON.stringify({
        type: 'login',
        payload: { username: user, password: pass }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;

        switch (type) {
          case 'login_success': {
            setPlayer(payload.player);
            setWorld(payload.world);
            setPlayers(payload.players);
            setMarketplace(payload.marketplace);
            setGuilds(payload.guilds);
            setAntiCheatLogs(payload.antiCheatLogs || []);
            setIsLoggedIn(true);
            setLoginError('');
            break;
          }

          case 'login_fail': {
            setLoginError(payload);
            alert(`Login Failure: ${payload}`);
            break;
          }

          case 'player_joined': {
            const joined: Player = payload.player;
            setPlayers(p => {
              // Deduplicate
              if (p.some(pl => pl.id === joined.id)) return p;
              return [...p, joined];
            });
            break;
          }

          case 'player_moved': {
            const { id, x, y, vx, vy } = payload;
            setPlayers(current => 
              current.map(p => p.id === id ? { ...p, x, y, vx, vy } : p)
            );
            break;
          }

          case 'player_left': {
            const leftId = payload.id;
            setPlayers(current => current.filter(p => p.id !== leftId));
            break;
          }

          case 'player_updated': {
            const updatedPlayer: Player = payload.player;
            setPlayer(updatedPlayer);
            // Also update in players array
            setPlayers(current => 
              current.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
            );
            break;
          }

          case 'player_updated_broadcast': {
            const { playerId, activeEquipment } = payload;
            setPlayers(current =>
              current.map(p => p.id === playerId ? { ...p, activeEquipment } : p)
            );
            break;
          }

          case 'world_update': {
            const tiles: GameWorld['tiles'] = payload.tiles;
            setWorld(current => current ? { ...current, tiles } : null);
            break;
          }

          case 'marketplace_update': {
            setMarketplace(payload.marketplace);
            break;
          }

          case 'guilds_update': {
            setGuilds(payload.guilds);
            break;
          }

          case 'anti_cheat_log': {
            const newLog = payload;
            setAntiCheatLogs(current => [newLog, ...current].slice(0, 50));
            break;
          }

          case 'chat_receive': {
            const newMsg: ChatMessage = payload;
            setChatMessages(current => [...current, newMsg]);
            break;
          }

          case 'force_correction': {
            const { x, y, reason } = payload;
            // append to system chat as notice
            setChatMessages(current => [
              ...current,
              {
                id: 'correct-' + Math.random(),
                sender: 'System GrowShield',
                text: `Anti-Cheat forced correction snap: ${reason}`,
                channel: 'system',
                timestamp: Date.now()
              }
            ]);
            break;
          }

          case 'error': {
            alert(`[Server Message] ${payload}`);
            break;
          }

          default:
            break;
        }

      } catch (err) {
        console.error("Error decoding message payload", err);
      }
    };

    socket.onclose = () => {
      setIsLoggedIn(false);
      setPlayer(null);
      setWorld(null);
    };

    socket.onerror = (err) => {
      console.error("Socket socket error", err);
    };
  };

  // CLIENT INTERACTIONS WRAPPER
  const sendSocketMessage = (type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  const handleTileClick = (tx: number, ty: number, action: 'punch' | 'place') => {
    if (action === 'place' && selectedItemId) {
      sendSocketMessage('place', { tx, ty, blockId: selectedItemId });
    } else {
      sendSocketMessage('punch', { tx, ty });
    }
  };

  const handleMove = (x: number, y: number, vx: number, vy: number) => {
    sendSocketMessage('move', { x, y, vx, vy });
  };

  const handleUpdateSignText = (tx: number, ty: number, text: string) => {
    sendSocketMessage('update_sign', { tx, ty, text });
  };

  const handleSplice = (seedA: string, seedB: string) => {
    sendSocketMessage('splice_seeds', { seedA, seedB });
  };

  const handleBuyShop = (id: string) => {
    sendSocketMessage('buy_shop', { shopItemId: id });
  };

  const handleEquipItem = (id: string | null) => {
    sendSocketMessage('equip_item', { equipId: id });
  };

  const handleListMarket = (itemId: string, count: number, priceGems: number) => {
    sendSocketMessage('list_market', { itemId, count, priceGems });
  };

  const handleBuyMarket = (marketId: string) => {
    sendSocketMessage('buy_market', { marketId });
  };

  const handleCancelMarket = (marketId: string) => {
    sendSocketMessage('cancel_market', { marketId });
  };

  const handleSendMessage = (text: string, channel: 'world' | 'guild') => {
    sendSocketMessage('chat', { text, channel });
  };

  const handleCreateGuild = (guildName: string) => {
    sendSocketMessage('guild_create', { guildName });
  };

  const handleJoinGuild = (targetGuildId: string) => {
    sendSocketMessage('guild_join', { targetGuildId });
  };

  const handleLeaveGuild = () => {
    sendSocketMessage('guild_leave', {});
  };

  const handleDonateGuild = (donateAmount: number) => {
    sendSocketMessage('guild_donate', { donateAmount });
  };

  // Launch Launcher screen until login complete
  if (!isLoggedIn || !player || !world) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Calculate stats values
  const activeGuildObj = guilds.find(g => g.id === player.guildId);

  return (
    <div id="app-root-container" className="min-h-screen bg-[#EEF2FF] text-[#1E1B4B] flex flex-col font-sans pb-10">
      
      {/* HEADER BAR */}
      <header className="max-w-7xl mx-auto w-full px-4 pt-6">
        <div id="header-bar-card" className="bg-white border-4 border-[#4F46E5] rounded-3xl p-4 shadow-[8px_8px_0px_0px_rgba(79,70,229,1)] flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand identity */}
          <div className="flex items-center gap-4">
            <div id="brand-logo-badge" className="w-14 h-14 bg-[#F59E0B] rounded-2xl flex items-center justify-center border-4 border-black text-white text-3xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              A
            </div>
            <div>
              <h1 id="brand-title" className="text-2xl font-black text-[#1E1B4B] uppercase tracking-tight flex items-center gap-2">
                AstraWorld 
                <span className="text-xs font-bold bg-[#10B981] text-white px-2 py-0.5 rounded-full border border-black shadow-[1.5px_1.5px_0px_0px]">V.1.0.4</span>
              </h1>
              <p className="text-[#6366F1] font-bold text-xs uppercase tracking-wider">
                Connected to Cloud: Global-East-1
              </p>
            </div>
          </div>

          {/* Player stats indicators */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <div className="bg-[#E0E7FF] border-2 border-black rounded-xl px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span>👤 Profile:</span>
              <span className="underline">{player.username}</span>
            </div>

            <div className="bg-[#BAE6FD] border-2 border-black rounded-xl px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span>👥 Online:</span>
              <span className="text-blue-700">{players.length + 1} players</span>
            </div>

            {activeGuildObj && (
              <div className="bg-[#FDE68A] border-2 border-black rounded-xl px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-300" />
                <span>Faction: <span className="underline">{activeGuildObj.name}</span> (Lv.{activeGuildObj.level})</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PRIMARY DASHBOARD GRID */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* World stats alert */}
        <div id="lobby-stats-alert" className="bg-[#FDE68A] border-4 border-black p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[#1E1B4B]">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
            <span className="text-3xl">💎</span>
            <p className="leading-snug">
              Welcome back to <span className="underline text-[#4F46E5] font-black">Lobby Worlds!</span> Explore interactive cavern layers, plant seeds & break solid blocks to harvest gems!
            </p>
          </div>
          <div className="text-xxs font-black font-mono bg-white border border-black px-2.5 py-1.5 rounded-xl uppercase shrink-0">
            Dimension Map Grid: {world.width} x {world.height} Blocks
          </div>
        </div>

        {/* 1. Editable World Sandbox Canvas and Console */}
        <section className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-black uppercase text-[#1E1B4B] tracking-wider mb-1">
              🎮 Sandbox Multi-Player Interactive Canvas
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              💡 Tip: Double-tap custom seeds in backpack to breed
            </p>
          </div>
          
          <GameCanvas
            world={world}
            localPlayer={player}
            players={players}
            selectedItemCode={selectedItemId}
            activeEquipment={player.activeEquipment}
            onTileClick={handleTileClick}
            onMove={handleMove}
            onUpdateSignText={handleUpdateSignText}
            antiCheatLogs={antiCheatLogs}
          />
        </section>

        {/* 2. Interactive backpack inventory / splicing toolbar */}
        <section className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-black uppercase text-[#1E1B4B] tracking-wider mb-1">
              🎒 Gear, Supplies & Seed Breeding Station
            </h2>
            {selectedItemId && (
              <button 
                id="btn-clear-selection"
                onClick={() => setSelectedItemId(null)}
                className="text-[10px] text-[#F43F5E] hover:underline font-black uppercase bg-white border border-black px-2 py-0.5 rounded cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                Clear current selection (Switch back to punch tools)
              </button>
            )}
          </div>
          
          <ActiveInventory
            inventory={player.inventory}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onEquipItem={handleEquipItem}
            onSplice={handleSplice}
            activeEquipment={player.activeEquipment}
          />
        </section>

        {/* 3. Shop & Player Auction Marketplace */}
        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase text-[#1E1B4B] tracking-wider mb-1 px-1">
            ⚖️ Global Commodities Shop & player Exchange board
          </h2>
          <ShopMarketplace
            player={player}
            marketplace={marketplace}
            onBuyShop={handleBuyShop}
            onListMarket={handleListMarket}
            onBuyMarket={handleBuyMarket}
            onCancelMarket={handleCancelMarket}
          />
        </section>

        {/* 4. Communal Chat & Guild Associations */}
        <section className="space-y-2">
          <h2 className="text-xs font-black uppercase text-[#1E1B4B] tracking-wider mb-1 px-1">
            💬 Interactive Community Rooms & Faction Ledgers
          </h2>
          <GuildChat
            player={player}
            chatMessages={chatMessages}
            guilds={guilds}
            onSendMessage={handleSendMessage}
            onCreateGuild={handleCreateGuild}
            onJoinGuild={handleJoinGuild}
            onLeaveGuild={handleLeaveGuild}
            onDonateGuild={handleDonateGuild}
          />
        </section>

      </main>

    </div>
  );
}
