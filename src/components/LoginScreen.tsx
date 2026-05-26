import React, { useState } from 'react';
import { ShieldCheck, User, Eye, EyeOff, Sparkles, Coins, Gamepad2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (u: string, p: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-load fun pixel username options
  const randomNames = ["SplicerPro", "GrowLord", "GemMiner", "WLLegend", "LavaJumper", "TerraformGuy"];

  const handleRandomize = () => {
    const idx = Math.floor(Math.random() * randomNames.length);
    setUsername(randomNames[idx] + Math.floor(Math.random() * 900 + 100));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }
    setErrorMsg('');
    onLogin(username.trim(), password.trim() || '123456');
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#EEF2FF] text-[#1E1B4B] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Playful background grid of neobrutalist grid alignment */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>

      <div id="login-card" className="w-full max-w-lg bg-white border-4 border-[#4F46E5] rounded-[32px] shadow-[8px_8px_0px_0px_rgba(79,70,229,1)] p-8 z-10 relative">
        
        {/* Playful badge atop */}
        <div className="text-center mb-6">
          <div id="lobby-active-badge" className="inline-flex items-center gap-2 bg-[#F59E0B] text-white border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-4 h-4 text-white" />
            REAL-TIME CLOUD SANDBOX
          </div>
          
          <h1 id="app-title" className="text-4xl font-black text-[#1E1B4B] uppercase tracking-tight flex flex-col gap-1 items-center justify-center">
            <span>AstraWorld</span>
            <span className="text-xs font-bold bg-[#10B981] text-white px-3 py-1 rounded-full uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Online Multiplayer Sandbox
            </span>
          </h1>
          <p className="text-[#6366F1] font-bold text-sm uppercase mt-2">
            Connected to Cloud: Global-East-1
          </p>
        </div>

        {/* Input Details Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#1E1B4B] mb-1.5 flex justify-between items-center">
              <span>GrowID Profile name</span>
              <button 
                id="btn-random-name"
                type="button" 
                onClick={handleRandomize}
                className="text-[#4F46E5] hover:underline text-xs font-black normal-case cursor-pointer"
              >
                🎲 Random Name Generator
              </button>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <User className="w-4 h-4 text-[#1E1B4B]" />
              </span>
              <input
                id="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={18}
                placeholder="Enter GrowID..."
                className="w-full bg-slate-50 border-2 border-black rounded-xl py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4F46E5] font-black transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#1E1B4B] mb-1.5">
              Secure character password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#1E1B4B]" />
              </span>
              <input
                id="input-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type password..."
                className="w-full bg-slate-50 border-2 border-black rounded-xl py-3 pl-10 pr-10 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4F46E5] font-black transition-colors"
              />
              <button
                id="btn-toggle-password"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div id="login-error-toast" className="text-white text-xs bg-[#F43F5E] border-2 border-black px-3 py-2 rounded-xl font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black py-4 px-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] focus:outline-none transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm"
          >
            <Gamepad2 className="w-5 h-5 text-white" />
            ENTER THE SANDBOX LOBBY
          </button>
        </form>

        {/* Feature Highlights Bento row */}
        <div className="grid grid-cols-3 gap-2.5 border-t-2 border-dashed border-slate-300 mt-6 pt-6 text-center">
          <div className="bg-[#BAE6FD] border-2 border-black rounded-2xl p-2 flex flex-col items-center justify-center">
            <span className="text-2xl mt-0.5">🌱</span>
            <span className="text-[10px] font-black uppercase text-[#1E1B4B] mt-1 tracking-tight">Splice seeds</span>
          </div>
          <div className="bg-[#FDE68A] border-2 border-black rounded-2xl p-2 flex flex-col items-center justify-center">
            <span className="text-2xl mt-0.5">🪙</span>
            <span className="text-[10px] font-black uppercase text-[#1E1B4B] mt-1 tracking-tight">Free Trade</span>
          </div>
          <div className="bg-[#BAE6FD] border-2 border-black rounded-2xl p-2 flex flex-col items-center justify-center">
            <span className="text-2xl mt-0.5">🛡️</span>
            <span className="text-[10px] font-black uppercase text-[#1E1B4B] mt-1 tracking-tight">Anticheat</span>
          </div>
        </div>

        {/* Informational tip panel */}
        <div id="welcome-controls-tip" className="mt-5 p-3.5 bg-[#EEF2FF] border-2 border-black rounded-2xl text-center">
          <span className="text-[#1E1B4B] text-[11px] font-bold block leading-relaxed uppercase">
            🎮 MOVEMENT: Use <kbd className="px-1.5 py-0.5 bg-white border border-black rounded text-[#1E1B4B] mx-0.5">W</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-black rounded text-[#1E1B4B] mx-0.5">A</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-black rounded text-[#1E1B4B] mx-0.5">S</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-black rounded text-[#1E1B4B] mx-0.5">D</kbd> or Arrows to Jump & Walk.
            <br />
            🌱 Plant or Punch adjacent block coordinates to survive!
          </span>
        </div>
      </div>
    </div>
  );
}
