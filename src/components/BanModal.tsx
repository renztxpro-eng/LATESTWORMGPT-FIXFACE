import React, { useState, useEffect } from 'react';
import { Lock, Timer } from 'lucide-react';

export default function BanModal({ ban, close }: { ban: { reason: string, until: string }, close: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('Calculating...');

  const parseBanDate = (dateStr: string) => {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      const [_, y, m, d, h, min, s, ampm] = match;
      let hours = parseInt(h, 10);
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      const isoString = `${y}-${m}-${d}T${hours.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}+08:00`;
      return new Date(isoString).getTime();
    }
    let str = dateStr;
    if (!str.includes('T')) str = str.replace(' ', 'T');
    if (!str.endsWith('Z') && !str.includes('+')) {
      str += '+08:00';
    }
    const parsed = new Date(str).getTime();
    return isNaN(parsed) ? null : parsed;
  };

  useEffect(() => {
    const banTime = parseBanDate(ban.until);
    if (!banTime) {
      setTimeLeft('Unknown Duration');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = banTime - now;

      if (diff <= 0) {
        setTimeLeft('Expired (Refresh needed)');
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0 || d > 0) parts.push(`${h}h`);
      if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);

      setTimeLeft(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [ban.until]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-sm flex flex-col items-center shadow-2xl relative overflow-hidden p-8">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#f85149] via-[#8957e5] to-[#f85149]" />
        
         <div className="w-20 h-20 bg-[#f85149]/10 rounded-full flex items-center justify-center mb-6 border border-[#f85149]/20">
            <Lock className="w-10 h-10 text-[#f85149]" />
         </div>

         <h2 className="text-2xl font-bold text-[#f85149] mb-4 tracking-tight text-center">ACCOUNT BANNED</h2>
         
         <div className="w-full h-px bg-[#30363d]/50 mb-6" />

         <div className="w-full space-y-4">
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
               <span className="text-[10px] text-[#8b949e] font-bold block mb-1 uppercase tracking-wider">Reason for Ban</span>
               <span className="text-sm text-[#e6edf3] leading-relaxed">{ban.reason}</span>
            </div>
            
            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex flex-col">
               <span className="text-[10px] text-[#8b949e] font-bold block mb-1 uppercase tracking-wider">Time Remaining</span>
               <div className="flex items-center gap-2 text-md font-extrabold text-[#f85149] font-mono leading-none py-1">
                 <Timer size={16} className="text-[#f85149] animate-pulse" />
                 <span>{timeLeft}</span>
               </div>
            </div>

            <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
               <span className="text-[10px] text-[#8b949e] font-bold block mb-1 uppercase tracking-wider">Banned Until</span>
               <span className="text-xs font-bold text-[#d29922] font-mono">{ban.until}</span>
            </div>
         </div>

         <p className="text-xs text-[#8b949e] text-center mt-6 mb-6 leading-relaxed px-4">
            Access to communication capabilities is completely restricted. Once the protocol countdown completes, features will resume.
         </p>

         <button 
            onClick={close}
            className="bg-[#f85149] text-white rounded-xl w-full py-4 font-bold text-sm hover:bg-[#f85149]/90 transition-all shadow-lg shadow-[#f85149]/20 cursor-pointer"
         >
            I UNDERSTAND
         </button>
      </div>
    </div>
  );
}
