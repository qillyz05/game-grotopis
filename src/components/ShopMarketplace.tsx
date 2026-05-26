import React, { useState } from 'react';
import { MarketplaceItem, Player, ITEM_DATABASE } from '../types.js';
import { ShoppingBag, Coins, Trash2, PlusCircle, BookmarkCheck, ArrowRightLeft } from 'lucide-react';

interface ShopMarketplaceProps {
  player: Player;
  marketplace: MarketplaceItem[];
  onBuyShop: (id: string) => void;
  onListMarket: (itemCode: string, qty: number, priceGems: number) => void;
  onBuyMarket: (auctionId: string) => void;
  onCancelMarket: (auctionId: string) => void;
}

export default function ShopMarketplace({
  player,
  marketplace,
  onBuyShop,
  onListMarket,
  onBuyMarket,
  onCancelMarket
}: ShopMarketplaceProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'bazaar'>('shop');

  // Input state for listing item to public board
  const [listCode, setListCode] = useState('');
  const [listCount, setListCount] = useState<number>(1);
  const [listPrice, setListPrice] = useState<number>(100);
  const [listError, setListError] = useState('');

  const shopItems = [
    { id: 'buy_dirt_seed', name: 'Dirt Seed Bag', desc: 'Splicer Base. Holds 10 Dirt Seeds.', cost: 10, icon: '🌱' },
    { id: 'buy_cave_seed', name: 'Cave Wall Seed Bag', desc: 'Splicer Base. Holds 10 Background seeds.', cost: 15, icon: '🌱' },
    { id: 'buy_rock_seed', name: 'Rock Seed Bundle', desc: 'Dense Base. Holds 5 Rock seeds.', cost: 40, icon: '🌱' },
    { id: 'buy_lava_seed', name: 'Lava Seed Sack', desc: 'Exotic. Holds 2 Lava seeds.', cost: 150, icon: '🔥' },
    { id: 'buy_world_lock', name: 'Golden World Lock', desc: 'Secure territory claims. Protects grid segments.', cost: 2000, icon: '🔒' },
    { id: 'equip_pickaxe', name: 'Steel Pickaxe', desc: 'Allows you to mine/break blocks 50% faster.', cost: 500, icon: '⛏️' },
    { id: 'equip_wings', name: 'Divine Angel Wings', desc: 'Allows you to jump 40% higher with slow float descent.', cost: 4000, icon: '🕊️' },
    { id: 'equip_boots', name: 'Hermes Speed Boots', desc: 'Allows you to run 30% faster on soil terrains.', cost: 1500, icon: '👟' },
  ];

  const handlePostListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listCode) {
      setListError('Select an item to sell!');
      return;
    }
    if (listCount <= 0 || listPrice <= 0) {
      setListError('Invalid amount or price!');
      return;
    }

    const inventoryCheck = player.inventory.find(i => i.id === listCode);
    if (!inventoryCheck || inventoryCheck.count < listCount) {
      setListError(`You do not have ${listCount}x of this item!`);
      return;
    }

    setListError('');
    onListMarket(listCode, listCount, listPrice);
    
    // reset form fields
    setListCode('');
    setListCount(1);
    setListPrice(100);
  };

  return (
    <div id="shop-marketplace-container" className="bg-white border-4 border-black rounded-[32px] p-6 text-[#1E1B4B] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      
      {/* Tab Selectors & Player gems status */}
      <div className="flex flex-col sm:flex-row border-b-2 border-black pb-4 mb-5 items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            id="tab-npc-shop"
            onClick={() => setActiveTab('shop')}
            className={`cursor-pointer px-4.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] ${
              activeTab === 'shop'
                ? 'bg-[#4F46E5] text-white'
                : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            🤖 COCOS MERCHANT RESOURCE SHOP
          </button>
          <button
            id="tab-bazaar"
            onClick={() => setActiveTab('bazaar')}
            className={`cursor-pointer px-4.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] ${
              activeTab === 'bazaar'
                ? 'bg-[#4F46E5] text-white'
                : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            ⚖️ PUBLIC BAZAAR BIDBOARD
          </button>
        </div>

        <div id="gems-balance-badge" className="inline-flex self-start sm:self-auto items-center gap-1.5 bg-[#FDE68A] border-2 border-black px-4 py-2 rounded-2xl text-xs font-black text-[#1E1B4B] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase tracking-tight">
          <Coins className="w-4 h-4 animate-bounce text-amber-600 fill-amber-400" />
          <span>My Balance: {player.gems.toLocaleString()} Gems</span>
        </div>
      </div>

      {/* SHOP BODY */}
      {activeTab === 'shop' && (
        <div id="npc-shop-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 max-h-[20.5rem] overflow-y-auto pr-2 scrollbar-thin">
          {shopItems.map((item) => {
            const isAffordable = player.gems >= item.cost;
            return (
              <div 
                key={item.id} 
                className="bg-white border-4 border-black rounded-[24px] p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-y-[-1px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl bg-[#BAE6FD] w-10 h-10 flex items-center justify-center rounded-xl border-2 border-black">{item.icon}</span>
                    <span className="text-xxs font-black text-[#1E1B4B] bg-[#FDE68A] border-2 border-black px-2 py-0.5 rounded-full">
                      {item.cost} GEMS
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-[#1E1B4B] mb-1.5 uppercase tracking-tight">{item.name}</h4>
                  <p className="text-[11px] font-bold text-slate-600 leading-normal mb-4">
                    {item.desc}
                  </p>
                </div>

                <button
                  onClick={() => onBuyShop(item.id)}
                  className={`w-full py-2.5 rounded-xl font-black text-xxs transition-all cursor-pointer border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] uppercase ${
                    isAffordable 
                      ? 'bg-[#10B981] hover:bg-[#059669] text-white' 
                      : 'bg-[#C7D2FE] text-slate-700 opacity-70 cursor-not-allowed'
                  }`}
                  disabled={!isAffordable}
                >
                  {isAffordable ? '🛒 Purchase Item' : '❌ Low Balance'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* BAZAAR BAZAAR */}
      {activeTab === 'bazaar' && (
        <div id="public-bazaar-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[22.5rem] overflow-hidden">
          
          {/* Post item container */}
          <div className="lg:col-span-4 bg-[#BAE6FD] border-4 border-black rounded-[24px] p-4 flex flex-col justify-between max-h-[21rem] overflow-y-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <h4 className="text-xs font-black text-[#1E1B4B] uppercase mb-2 flex items-center gap-1.5">
                <PlusCircle className="text-[#4F46E5] w-5 h-5 fill-[#E0E7FF]" />
                Publish Trade Auction
              </h4>
              <p className="text-[11px] font-bold text-slate-700 leading-normal mb-3">
                Deploy some of your spare seeds or materials to the communal marketplace grid.
              </p>
            </div>

            <form onSubmit={handlePostListing} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-[#1E1B4B] mb-1 uppercase tracking-wider">
                  Select Item to sell
                </label>
                <select
                  value={listCode}
                  onChange={(e) => setListCode(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#4F46E5] font-black text-slate-900"
                >
                  <option value="" className="font-sans">-- Choose pack item --</option>
                  {player.inventory.map(item => (
                    <option key={item.id} value={item.id} className="font-sans">
                      {item.name} (Count: {item.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-[#1E1B4B] mb-1 uppercase tracking-wider">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={listCount}
                    onChange={(e) => setListCount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border-2 border-black rounded-lg py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] font-black"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#1E1B4B] mb-1 uppercase tracking-wider">
                    Gems Price
                  </label>
                  <input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border-2 border-black rounded-lg py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] font-black"
                  />
                </div>
              </div>

              {listError && (
                <p className="text-[#F43F5E] text-[10px] font-black bg-white border border-black p-1.5 rounded-lg">{listError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-xxs py-2.5 px-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-tight"
              >
                📥 DEPLOY LISTING ON BAZAAR
              </button>
            </form>

            <span className="text-[9px] text-slate-800 leading-tight block mt-3 font-semibold bg-white/50 p-2 rounded-lg border border-black/10">
              💡 BAZAAR ECONOMICS: Hard-spliced blocks or equipment (e.g. Speed boots) can trade for high values!
            </span>
          </div>

          {/* Active Listings list */}
          <div className="lg:col-span-8 flex flex-col max-h-[21rem]">
            <h4 className="text-xs font-black text-[#1E1B4B] uppercase mb-2 flex items-center gap-1.5">
              <BookmarkCheck className="text-[#10B981] w-4 h-4" />
              COMMUNAL PLAYER EXCHANGE LISTINGS ({marketplace.length})
            </h4>

            <div className="flex-1 overflow-y-auto border-4 border-black rounded-3xl bg-slate-50 p-3 space-y-2.5 max-h-[18rem] scrollbar-thin">
              {marketplace.map((offer) => {
                const isMyOffer = offer.sellerId === player.id;
                const canAfford = player.gems >= offer.priceGems;
                return (
                  <div
                    key={offer.id}
                    className="bg-white border-2 border-black rounded-2xl p-3 flex items-center justify-between gap-4 transition-all hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl bg-slate-100 border border-black/20 p-1 rounded-xl">{offer.itemKind === 'SEED' ? '🌱' : '🧱'}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#1E1B4B] uppercase tracking-tight">{offer.itemName}</span>
                          <span className="text-[10px] text-white font-black px-2 py-0.2 bg-[#4F46E5] border border-black rounded font-mono">
                            COUNT: {offer.count}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                          Vendor: <span className="text-slate-800 font-extrabold">{offer.sellerName}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-600 bg-[#FDE68A] border border-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0">
                        🪙 {offer.priceGems.toLocaleString()} G
                      </span>

                      {isMyOffer ? (
                        <button
                          onClick={() => onCancelMarket(offer.id)}
                          className="bg-[#F43F5E] hover:bg-[#E11D48] text-white border-2 border-black p-2 rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                          title="Cancel Trade"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onBuyMarket(offer.id)}
                          className={`px-3 py-1.5 rounded-xl text-xxs font-black text-white cursor-pointer border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all uppercase ${
                            canAfford 
                              ? 'bg-[#10B981] hover:bg-[#059669]' 
                              : 'bg-[#C7D2FE] text-slate-700 opacity-60 cursor-not-allowed'
                          }`}
                          disabled={!canAfford}
                        >
                          {canAfford ? '⚡ PURCHASE' : '❌ FUNDS LOW'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {marketplace.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <span className="text-3xl mb-1 select-none">🏪</span>
                  <p className="text-xxs text-slate-500 font-black uppercase tracking-tight">
                    No active postings found on bidboard. Be the first to list!
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
