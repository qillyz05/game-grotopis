import React, { useState } from 'react';
import { InventoryItem, ITEM_DATABASE, ItemKind } from '../types.js';
import { Sparkles, HelpCircle, AlertCircle, PlayCircle } from 'lucide-react';

interface ActiveInventoryProps {
  inventory: InventoryItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onEquipItem: (id: string | null) => void;
  onSplice: (seedA: string, seedB: string) => void;
  activeEquipment: string | null;
}

export default function ActiveInventory({
  inventory,
  selectedItemId,
  onSelectItem,
  onEquipItem,
  onSplice,
  activeEquipment
}: ActiveInventoryProps) {
  // Splicing seed selections
  const [spliceSeedA, setSpliceSeedA] = useState<string | null>(null);
  const [spliceSeedB, setSpliceSeedB] = useState<string | null>(null);

  const selectedItemData = selectedItemId ? ITEM_DATABASE[selectedItemId] : null;

  // Filter inventory items
  const seeds = inventory.filter(i => i.kind === ItemKind.SEED);
  const materials = inventory.filter(i => i.kind === ItemKind.BLOCK || i.kind === ItemKind.BACKGROUND);
  const equipment = inventory.filter(i => i.kind === ItemKind.EQUIPMENT);

  const handleApplySplice = () => {
    if (spliceSeedA && spliceSeedB) {
      onSplice(spliceSeedA, spliceSeedB);
      // Reset after splicing attempt
      setSpliceSeedA(null);
      setSpliceSeedB(null);
    }
  };

  const handleSelectForSplice = (seedId: string) => {
    if (!spliceSeedA) {
      setSpliceSeedA(seedId);
    } else if (!spliceSeedB) {
      if (spliceSeedA === seedId) {
        // can't splice with itself UNLESS they have multiple count
        const invItem = inventory.find(i => i.id === seedId);
        if (invItem && invItem.count > 1) {
          setSpliceSeedB(seedId);
        }
      } else {
        setSpliceSeedB(seedId);
      }
    } else {
      // both filled, reset first
      setSpliceSeedA(seedId);
      setSpliceSeedB(null);
    }
  };

  return (
    <div id="active-inventory-container" className="bg-white border-4 border-black rounded-[32px] p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-[#1E1B4B] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      
      {/* 1. SEED SPLICING BENCH */}
      <div id="splice-bench-card" className="lg:col-span-4 bg-[#C7D2FE] border-4 border-black rounded-3xl p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-[#1E1B4B] mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" />
            🛠️ Splicing Lab Station
          </h3>
          <p className="text-[11px] font-bold text-slate-800 mb-4 bg-white/60 p-2 rounded-lg border border-black/10">
            Combine different seed varieties to sprout rare locks, building materials, and portals.
          </p>

          <div className="flex items-center gap-3 justify-center py-3 bg-white/70 border-2 border-black rounded-2xl mb-4">
            <button 
              id="bench-seed-a"
              onClick={() => setSpliceSeedA(null)} 
              className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer font-black transition-transform active:scale-95 ${
                spliceSeedA ? 'border-black bg-[#FDE68A] text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-dashed border-slate-400 bg-white/40 text-slate-400 hover:border-slate-800'
              }`}
            >
              <span className="text-xl">{spliceSeedA ? '🌱' : '+'}</span>
              <span className="text-[9px] font-black select-none block max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-0.5 uppercase tracking-tighter">
                {spliceSeedA ? spliceSeedA.split('_')[0] : 'Slot A'}
              </span>
            </button>

            <span className="text-[#1E1B4B] font-black text-xl select-none">🔗</span>

            <button 
              id="bench-seed-b"
              onClick={() => setSpliceSeedB(null)} 
              className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer font-black transition-transform active:scale-95 ${
                spliceSeedB ? 'border-black bg-[#FDE68A] text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-dashed border-slate-400 bg-white/40 text-slate-400 hover:border-slate-800'
              }`}
            >
              <span className="text-xl">{spliceSeedB ? '🌱' : '+'}</span>
              <span className="text-[9px] font-black select-none block max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-0.5 uppercase tracking-tighter">
                {spliceSeedB ? spliceSeedB.split('_')[0] : 'Slot B'}
              </span>
            </button>
          </div>
        </div>

        <div>
          {spliceSeedA && spliceSeedB ? (
            <button
              id="btn-trigger-splice"
              onClick={handleApplySplice}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black py-2.5 rounded-xl text-xs uppercase cursor-pointer border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              🧬 UNLEASH SPLICE BREWING
            </button>
          ) : (
            <div className="text-center p-2.5 bg-white/50 border-2 border-[#1E1B4B] border-dashed rounded-xl text-[10px] text-slate-700 font-bold uppercase tracking-tight">
              Select Seeds below to begin Splice
            </div>
          )}
        </div>
      </div>

      {/* 2. INVENTORY VIEWER (MATERIALS & SEEDS) */}
      <div id="backpack-scroll-panel" className="lg:col-span-5 flex flex-col max-h-[17rem] overflow-hidden">
        <h3 className="text-sm font-black uppercase tracking-tight text-[#1E1B4B] mb-2.5">
          🎒 Backpack Storage / Inventory
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
          {/* Seeds Sector */}
          {seeds.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase text-[#6366F1] mb-1.5 tracking-wider">🌱 Seed Packets (Double click to splice)</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {seeds.map((item) => {
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectItem(item.id)}
                      onDoubleClick={() => handleSelectForSplice(item.id)}
                      className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all active:scale-95 ${
                        selectedItemId === item.id 
                          ? 'border-black bg-[#FDE68A] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                          : 'border-black bg-white hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                      }`}
                      title="Double-click to load onto splicing bench"
                    >
                      <span className="text-xl">🌱</span>
                      <span className="text-[10px] font-black mt-0.5 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-slate-900 uppercase tracking-tighter">{item.name.split(' ')[0]}</span>
                      <span className="absolute bottom-1 right-1 text-[9px] font-black bg-white border border-black px-1.5 py-0.2 rounded text-[#1E1B4B] leading-none">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Solid blocks/walls Sector */}
          {materials.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase text-[#6366F1] mb-1.5 tracking-wider">🧱 Solid Blocks & Wall Paper</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {materials.map((item) => {
                  const details = ITEM_DATABASE[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectItem(item.id)}
                      className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all active:scale-95 ${
                        selectedItemId === item.id 
                          ? 'border-black bg-[#E0E7FF] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                          : 'border-black bg-white hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                      }`}
                    >
                      <div 
                        className="w-5 h-5 rounded border border-black" 
                        style={{ backgroundColor: details?.color || '#555' }}
                      />
                      <span className="text-[10px] font-black mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-slate-800 uppercase tracking-tighter">{item.name}</span>
                      <span className="absolute bottom-1 right-1 text-[9px] font-black bg-white border border-black px-1.5 py-0.2 rounded text-[#1E1B4B] leading-none">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equipment Accessories */}
          {equipment.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase text-[#6366F1] mb-1.5 tracking-wider">⚡ Cosmic Gear & Special Outfits</p>
              <div className="grid grid-cols-5 gap-2">
                {equipment.map((item) => {
                  const isEquipped = activeEquipment === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectItem(item.id)}
                      className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all active:scale-95 ${
                        isEquipped 
                          ? 'border-black bg-[#10B981] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                          : selectedItemId === item.id
                            ? 'border-black bg-[#BAE6FD] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'border-black bg-white hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      <span className="text-lg">⚙️</span>
                      <span className="text-[9px] font-black mt-0.5 block max-w-full overflow-hidden text-ellipsis text-center text-slate-900 leading-none uppercase tracking-tighter">{item.name.split(' ')[0]}</span>
                      {isEquipped && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-white border border-black flex items-center justify-center text-[6px]">✔</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {inventory.length === 0 && (
            <div className="text-center py-6 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
              🎒 Your backpack is completely empty!
            </div>
          )}
        </div>
      </div>

      {/* 3. ITEM INSPECTOR & USER CONTROLS */}
      <div id="item-inspector-card" className="lg:col-span-3 bg-[#BAE6FD] border-4 border-black rounded-3xl p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider mb-2">
            🔍 Selected Item Inspector
          </h4>

          {selectedItemData ? (
            <div className="bg-white border-2 border-black rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-dashed border-slate-200">
                {selectedItemData.kind === ItemKind.SEED ? (
                  <span className="text-2xl">🌱</span>
                ) : selectedItemData.kind === ItemKind.EQUIPMENT ? (
                  <span className="text-2xl">⚡</span>
                ) : (
                  <div className="w-6 h-6 rounded border border-black" style={{ backgroundColor: selectedItemData.color }} />
                )}
                <div>
                  <h5 className="text-xs font-black text-[#1E1B4B] uppercase leading-none">{selectedItemData.name}</h5>
                  <span className="text-[9px] font-black text-white bg-slate-900 border border-black px-1.5 py-0.2 rounded uppercase mt-1 inline-block">
                    {selectedItemData.kind}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                {selectedItemData.description}
              </p>
            </div>
          ) : (
            <div className="text-center py-6 bg-white/40 border-2 border-dashed border-slate-400 rounded-2xl">
              <HelpCircle className="w-8 h-8 text-slate-500 mx-auto mb-1.5" />
              <p className="text-[10px] text-slate-700 font-bold uppercase tracking-tight leading-snug px-2">
                Tap items inside the backpack to inspect properties or equip.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4">
          {selectedItemData && selectedItemData.kind === ItemKind.EQUIPMENT && (
            <button
              id="btn-equip-toggle"
              onClick={() => onEquipItem(activeEquipment === selectedItemId ? null : selectedItemId)}
              className={`w-full font-black py-2.5 rounded-xl text-xs cursor-pointer text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all uppercase ${
                activeEquipment === selectedItemId 
                  ? 'bg-[#F43F5E] hover:bg-[#E11D48]' 
                  : 'bg-[#10B981] hover:bg-[#059669]'
              }`}
            >
              {activeEquipment === selectedItemId ? '❌ UNEQUIP ACCESSORY' : '⚡ EQUIP THIS GEAR'}
            </button>
          )}

          {selectedItemData && selectedItemData.kind !== ItemKind.EQUIPMENT && (
            <div className="p-2.5 bg-white border-2 border-black rounded-xl text-[10px] font-black text-[#1E1B4B] uppercase tracking-tighter leading-normal">
              📌 PLACE INSTRUCTION: Click target grids around your character on the map to place or break!
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
