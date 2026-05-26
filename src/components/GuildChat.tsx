import React, { useState, useRef, useEffect } from 'react';
import { Player, ChatMessage, Guild } from '../types.js';
import { Send, Users, ShieldCheck, HelpCircle, Volume2, PlusCircle, Bookmark, MessageSquareDot } from 'lucide-react';

interface GuildChatProps {
  player: Player;
  chatMessages: ChatMessage[];
  guilds: Guild[];
  onSendMessage: (txt: string, chan: 'world' | 'guild') => void;
  onCreateGuild: (name: string) => void;
  onJoinGuild: (gId: string) => void;
  onLeaveGuild: () => void;
  onDonateGuild: (gemsCount: number) => void;
}

export default function GuildChat({
  player,
  chatMessages,
  guilds,
  onSendMessage,
  onCreateGuild,
  onJoinGuild,
  onLeaveGuild,
  onDonateGuild
}: GuildChatProps) {
  const [activeTab, setActiveTab] = useState<'lobby_chat' | 'guilds_tab'>('lobby_chat');
  const [chatChannel, setChatChannel] = useState<'world' | 'guild'>('world');
  const [msgText, setMsgText] = useState('');
  const [newGuildName, setNewGuildName] = useState('');
  const [donateAmmt, setDonateAmmt] = useState<number>(500);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    onSendMessage(msgText.trim(), chatChannel);
    setMsgText('');
  };

  const handleCreateG = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuildName.trim()) return;
    onCreateGuild(newGuildName.trim());
    setNewGuildName('');
  };

  const currentGuild = guilds.find(g => g.id === player.guildId);

  // Filter messages based on active channel selector inside Chat tab
  const displayedMessages = chatMessages.filter(msg => {
    if (chatChannel === 'guild') {
      return msg.channel === 'guild' || msg.channel === 'system';
    }
    return msg.channel === 'world' || msg.channel === 'system';
  });

  return (
    <div id="guild-chat-container" className="bg-white border-4 border-black rounded-[32px] p-6 text-[#1E1B4B] grid grid-cols-1 md:grid-cols-12 gap-6 h-[26.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      
      {/* LEFT NAVIGATION COLUMN */}
      <div className="md:col-span-3 flex flex-col justify-between border-r-2 border-dashed border-slate-300 pr-4">
        <div>
          <h3 className="text-xs font-black uppercase text-[#1E1B4B] tracking-wider mb-3">
            🌐 Community Hub
          </h3>

          <div className="space-y-2">
            <button
              id="sidebar-chat-tab"
              onClick={() => setActiveTab('lobby_chat')}
              className={`cursor-pointer w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] ${
                activeTab === 'lobby_chat'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <MessageSquareDot className="w-4.5 h-4.5" />
              LOBBY CHATS
            </button>
            <button
              id="sidebar-guilds-tab"
              onClick={() => setActiveTab('guilds_tab')}
              className={`cursor-pointer w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] ${
                activeTab === 'guilds_tab'
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              GUILDS MANAGER
            </button>
          </div>
        </div>

        {/* Character Card info preview */}
        <div id="char-badge-card" className="p-3 bg-[#FDE68A] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-4">
          <span className="text-[9px] font-black tracking-wider text-slate-800 block uppercase">ONLINE CHARACTER</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-ping"></div>
            <span className="text-xs font-black text-[#1E1B4B] uppercase">{player.username}</span>
          </div>
          {currentGuild ? (
            <span className="text-[10px] text-slate-700 font-bold block mt-1.5 uppercase">
              🏆 Guild: <span className="text-[#4F46E5] underline font-black">{currentGuild.name}</span>
            </span>
          ) : (
            <span className="text-[9px] font-bold text-slate-600 block mt-1 uppercase">No Guild Joined</span>
          )}
        </div>
      </div>

      {/* CHATS VIEW CHANNELS */}
      {activeTab === 'lobby_chat' && (
        <div id="chats-chat-view" className="md:col-span-9 flex flex-col h-full overflow-hidden">
          {/* Chat Channel sub-selectors */}
          <div className="flex bg-slate-100 border-2 border-black p-1 rounded-xl mb-3 text-xxs font-black gap-1">
            <button
              id="channel-to-world"
              onClick={() => setChatChannel('world')}
              className={`flex-1 py-1 rounded-lg text-center cursor-pointer font-black border-2 transition-all ${
                chatChannel === 'world' 
                  ? 'bg-[#F59E0B] text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'border-transparent text-slate-600 hover:bg-white/40'
              }`}
            >
              PUBLIC WORLD SCREEN
            </button>
            <button
              id="channel-to-guild"
              onClick={() => {
                if (!player.guildId) {
                  alert("Please join or register a guild to access private chat rooms!");
                  return;
                }
                setChatChannel('guild');
              }}
              className={`flex-1 py-1 rounded-lg text-center cursor-pointer font-black border-2 transition-all ${
                chatChannel === 'guild' 
                  ? 'bg-[#4F46E5] text-white border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'border-transparent text-slate-600 hover:bg-white/40'
              }`}
            >
              MY PRIVATE GUILD ROOM
            </button>
          </div>

          <div id="messages-scroller" className="flex-1 bg-slate-50 border-4 border-black rounded-[24px] p-4 overflow-y-auto space-y-2 h-[15.5rem] scrollbar-thin font-bold text-xxs">
            {displayedMessages.map((msg) => {
              const dateStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              // Neobrutalist bold tags with black outline
              let tagStyle = "text-[#4F46E5] bg-[#E0E7FF] border border-black";
              let nameStyle = "text-[#1E1B4B] font-black";
              
              if (msg.channel === 'guild') {
                tagStyle = "text-[#1E1B4B] bg-[#C7D2FE] border border-black";
              } else if (msg.channel === 'system') {
                tagStyle = "text-white bg-[#F43F5E] border border-black";
                nameStyle = "text-[#F43F5E] font-black";
              }

              return (
                <div key={msg.id} className="flex gap-2 items-start break-all hover:bg-black/5 p-1 rounded-lg">
                  <span className="text-[9px] text-[#6366F1] font-mono shrink-0 mt-0.5">[{dateStr}]</span>
                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${tagStyle}`}>
                    {msg.channel}
                  </span>
                  <div className="flex-1 text-[#1E1B4B]">
                    <span className={`font-black mr-1 text-slate-800 ${nameStyle}`}>{msg.sender}:</span>
                    <span className="font-semibold text-slate-700">{msg.text}</span>
                  </div>
                </div>
              );
            })}

            {displayedMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12 border-2 border-dashed border-slate-300 rounded-2xl">
                <Volume2 className="w-8 h-8 opacity-40 mb-1.5 text-slate-500" />
                No messages listed. Be the first to type a greeting!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2 mt-3">
            <input
              id="input-chat-message"
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder={`Send message to ${chatChannel} chat channel...`}
              maxLength={100}
              className="flex-1 bg-white border-2 border-black rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] placeholder-slate-400 font-bold"
            />
            <button
              id="btn-send-chat"
              type="submit"
              className="bg-[#10B981] hover:bg-[#059669] text-white p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px]"
            >
              <Send className="w-4.5 h-4.5 text-white" />
            </button>
          </form>
        </div>
      )}

      {/* GUILD CONTROLS */}
      {activeTab === 'guilds_tab' && (
        <div id="guilds-tabs-view" className="md:col-span-9 flex flex-col h-full overflow-hidden">
          {currentGuild ? (
            /* LAYER WITH GUILD CARD DETAILS */
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 divide-y md:divide-y-0 md:divide-x-2 divide-dashed divide-slate-300 max-h-[22rem] overflow-y-auto pr-1">
              
              {/* Guild Metrics information */}
              <div className="space-y-4 flex flex-col justify-between pr-2 pb-3">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-black text-[#1E1B4B] tracking-tight flex items-center gap-1.5 uppercase">
                        🛡️ {currentGuild.name}
                      </h4>
                      <span className="text-[10px] font-black text-slate-500 block uppercase">Signature Leader: {currentGuild.leaderName}</span>
                    </div>
                    <span className="text-xs bg-[#10B981] text-white border-2 border-black font-black px-2.5 py-0.5 rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase">
                      LEVEL {currentGuild.level}
                    </span>
                  </div>

                  {/* Active perk details */}
                  <div className="p-3 bg-[#E0E7FF] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-3">
                    <span className="text-[9px] font-black tracking-wider text-[#4F46E5] block uppercase">ACTIVE GUILD PERK BENEFIT</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                      Your faction grants all members a <span className="font-extrabold underline">+50% GEMS MULTIPLIER</span> multiplier when harvesting resource trees!
                    </p>
                  </div>
                </div>

                {/* Donate sector to upgrade level */}
                <div className="bg-slate-100 rounded-2xl p-3 border-2 border-black">
                  <h5 className="text-[10px] font-black text-slate-800 mb-1.5 uppercase flex justify-between tracking-tight">
                    <span>Community Treasury Donator Panel</span>
                    <span className="text-amber-600 font-black">{currentGuild.gemsDonated.toLocaleString()} / {(currentGuild.level * 2500).toLocaleString()} Gems</span>
                  </h5>
                  <div className="w-full bg-slate-300 rounded-full h-2 mb-3 border border-slate-400">
                    <div 
                      className="bg-amber-500 h-1.5 rounded-full transition-all border-r border-[#1E1B4B]" 
                      style={{ width: `${Math.min(100, (currentGuild.gemsDonated / (currentGuild.level * 2500)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      id="input-donate-amount"
                      type="number"
                      value={donateAmmt}
                      onChange={(e) => setDonateAmmt(Math.max(10, parseInt(e.target.value) || 0))}
                      className="w-24 bg-white border-2 border-black rounded-lg text-xs font-black text-center py-1 focus:outline-none"
                    />
                    <button
                      id="btn-donate-gems"
                      onClick={() => onDonateGuild(donateAmmt)}
                      className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white py-1 rounded-lg text-xs font-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:scale-95 cursor-pointer uppercase"
                    >
                      🪙 Donate Gems
                    </button>
                  </div>
                </div>

                <button
                  id="btn-exit-guild"
                  onClick={onLeaveGuild}
                  className="w-full bg-[#F43F5E] hover:bg-[#E11D48] border-2 border-black text-white font-black text-xxs py-2 rounded-xl cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] uppercase tracking-tight"
                >
                  🚪 EXIT Faction & FORFEIT BONUSES
                </button>
              </div>

              {/* Members Scroll list */}
              <div className="pl-4 flex flex-col justify-between pt-3 md:pt-0">
                <div>
                  <h5 className="text-[10px] font-black text-slate-800 uppercase mb-2 flex items-center gap-1.5 tracking-wider">
                    <Users className="w-4 h-4 text-[#4F46E5]" />
                    Members Roster ({currentGuild.members.length})
                  </h5>
                  <div className="space-y-1.5 max-h-[14rem] overflow-y-auto pr-1 scrollbar-thin">
                    {currentGuild.members.map(member => (
                      <div 
                        key={member.id} 
                        className="bg-white border-2 border-black py-2 px-3 rounded-xl flex justify-between items-center text-xs shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <span className="font-extrabold text-[#1E1B4B] uppercase">{member.username}</span>
                        <span className="text-[9px] font-black px-2 py-0.2 rounded bg-[#C7D2FE] text-[#1E1B4B] border border-black uppercase">
                          {member.rank}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* CREATE OR JOIN LOBBY VIEW */
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[22rem] overflow-y-auto pr-1">
              
              {/* Guild founder widget */}
              <div className="bg-[#BAE6FD] border-4 border-black rounded-[24px] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div>
                  <h4 className="text-xs font-black text-[#1E1B4B] uppercase mb-1.5 flex items-center gap-1.5">
                    <PlusCircle className="text-[#4F46E5] w-5 h-5 fill-[#E0E7FF]" />
                    Found a New Faction
                  </h4>
                  <p className="text-[11px] font-bold text-slate-700 leading-normal mb-3">
                    Declare a trademark. Building a corporate alliance grants resource harvesting multipliers! Licensing requires a fee of <span className="font-black text-slate-800">5,000 Gems</span>.
                  </p>

                  <form onSubmit={handleCreateG} className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-800 mb-1 uppercase tracking-wider">
                        Guild Signature Name
                      </label>
                      <input
                        id="input-new-guild-name"
                        type="text"
                        value={newGuildName}
                        onChange={(e) => setNewGuildName(e.target.value)}
                        placeholder="e.g., SPLICERS_LEGION"
                        maxLength={16}
                        className="w-full bg-white border-2 border-black rounded-lg py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] font-black uppercase"
                      />
                    </div>
                    <button
                      id="submit-register-guild"
                      type="submit"
                      className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black text-xxs py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      🛡️ REGISTER FACTION (5K GEMS)
                    </button>
                  </form>
                </div>
              </div>

              {/* List of other guilds player can choose to join */}
              <div className="flex flex-col">
                <h4 className="text-xs font-black text-slate-800 uppercase mb-2 flex items-center gap-1.5 tracking-wider">
                  <Bookmark className="text-[#F59E0B] w-4.5 h-4.5" />
                  Active Guild Registries list
                </h4>
                <div className="flex-1 overflow-y-auto border-4 border-black rounded-3xl bg-slate-50 p-2 space-y-2 max-h-[14rem] scrollbar-thin">
                  {guilds.map((guild) => (
                    <div 
                      key={guild.id} 
                      className="bg-white border-2 border-black p-2.5 rounded-xl flex justify-between items-center text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div>
                        <h5 className="font-black text-[#1E1B4B] uppercase tracking-tight">🛡️ {guild.name}</h5>
                        <div className="flex gap-2 text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                          <span>Lv.{guild.level}</span>
                          <span>•</span>
                          <span>{guild.members.length} members</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onJoinGuild(guild.id)}
                        className="bg-[#10B981] hover:bg-[#059669] text-white font-black text-xxs py-1.5 px-3 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-transform active:scale-95 uppercase"
                      >
                        JOIN
                      </button>
                    </div>
                  ))}

                  {guilds.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center p-5 text-slate-400 font-bold text-xxs border-2 border-dashed border-slate-200 rounded-2xl">
                      No active clubs founded yet. Start your own registry!
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
