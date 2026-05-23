import React from 'react';
import { useAppStore } from '../store';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const allModels = [
  { id: 'deepseek/deepseek-chat', name: 'CODING HACKING' },
  { id: 'deepseek/deepseek-v3.2', name: 'CODING FAST' },
  { id: 'openai/gpt-5.4-mini', name: 'MINIMAL' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DEEPSEEK V4 FLASH' },
  { id: 'meta-llama/llama-4', name: 'LLAMA 4' },
  { id: 'mistralai/mistral-large', name: 'MISTRAL LARGE' }
];

export default function ModelModal({ close, userStatus, openSubscription }: any) {
  const store = useAppStore();
  const isVip = userStatus?.vip_status && userStatus.vip_status.toLowerCase() !== 'free' && userStatus.vip_status.toLowerCase() !== 'guest';

  // Default lists representing standard/initial setup
  const defaultFreeList = ['deepseek/deepseek-chat', 'openai/gpt-5.4-mini'];
  const defaultPremiumList = [
    'deepseek/deepseek-chat',
    'deepseek/deepseek-v3.2',
    'openai/gpt-5.4-mini',
    'deepseek/deepseek-v4-flash',
    'meta-llama/llama-4',
    'mistralai/mistral-large'
  ];

  // Load cached settings if available
  const getCachedFree = (): string[] => {
    try {
      const cached = localStorage.getItem('wormgpt_free_models');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultFreeList;
  };

  const getCachedPremium = (): string[] => {
    try {
      const cached = localStorage.getItem('wormgpt_premium_models');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultPremiumList;
  };

  const availableModelsList = userStatus?.available_models;

  // React Effect to sync available list to localStorage
  React.useEffect(() => {
    if (Array.isArray(availableModelsList) && availableModelsList.length > 0) {
      if (isVip) {
        localStorage.setItem('wormgpt_premium_models', JSON.stringify(availableModelsList));
      } else {
        localStorage.setItem('wormgpt_free_models', JSON.stringify(availableModelsList));
      }
    }
  }, [availableModelsList, isVip]);

  // Determine current live lists based on role and cache fallback
  let liveFreeList = getCachedFree();
  let livePremiumList = getCachedPremium();

  if (Array.isArray(availableModelsList) && availableModelsList.length > 0) {
    if (isVip) {
      livePremiumList = availableModelsList;
    } else {
      liveFreeList = availableModelsList;
    }
  }

  // Allowed models represent the actual unlocked models for the user
  let allowedModels: string[] = [];
  if (!store.user || store.user.id.startsWith('offline_')) {
    allowedModels = liveFreeList;
  } else {
    allowedModels = isVip ? Array.from(new Set([...liveFreeList, ...livePremiumList])) : liveFreeList;
  }

  // Show all models
  const displayModels = allModels;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-sm flex flex-col relative max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
         <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#388bfd] via-[#8957e5] to-[#388bfd]" />
         
         <div className="p-4 border-b border-[#30363d] flex justify-between items-center pt-6 px-6">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e]">Select AI Intelligence</h2>
            <button onClick={close} className="text-[#8b949e] hover:text-white transition-colors">✕</button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#161b22]/30">
           {displayModels.map(m => {
             const isSelected = store.settings.selectedModel === m.id;
             const locked = !allowedModels.includes(m.id);

             // Dynamic badge classification
             let badge: 'free' | 'premium' | 'unavailable' = 'unavailable';

             // Classify according to dynamic lists
             if (liveFreeList.includes(m.id)) {
               badge = 'free';
             } else if (livePremiumList.includes(m.id)) {
               badge = 'premium';
             } else {
               badge = 'unavailable';
             }

             return (
               <div 
                 key={m.id} 
                 onClick={() => {
                   if (locked) {
                     if (openSubscription) openSubscription();
                     return;
                   }
                   store.setSettings({ selectedModel: m.id });
                   close();
                 }}
                 className={cn(
                   "flex justify-between items-center p-4 rounded-xl border transition-all duration-200",
                   isSelected 
                    ? "bg-[#388bfd]/5 border-[#388bfd] ring-1 ring-[#388bfd]/30" 
                    : "bg-[#0d1117] border-[#30363d] hover:border-[#388bfd]/40 hover:bg-[#161b22]",
                   locked ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"
                 )}
               >
                 <div className="flex flex-col gap-0.5">
                   <div className="flex items-center space-x-2">
                     <span className={cn("text-sm font-semibold tracking-tight", isSelected ? "text-[#388bfd]" : "text-[#e6edf3]")}>
                        {m.name}
                     </span>
                     {badge === 'free' ? (
                       <div className="flex items-center bg-[#238636]/15 border border-[#23aa3f]/30 px-1.5 py-0.5 rounded text-[9px] text-[#3fb950] font-bold uppercase tracking-wider">
                         Free
                       </div>
                     ) : badge === 'premium' ? (
                       <div className="flex items-center bg-[#ca8a04]/15 border border-[#ca8a04]/30 px-1.5 py-0.5 rounded text-[9px] text-[#eab308] font-bold uppercase tracking-wider">
                         <Sparkles className="w-2.5 h-2.5 mr-1" />
                         Premium
                       </div>
                     ) : (
                       <div className="flex items-center bg-[#f85149]/15 border border-[#f85149]/30 px-1.5 py-0.5 rounded text-[9px] text-[#f85149] font-bold uppercase tracking-wider">
                         Unavailable
                       </div>
                     )}
                   </div>
                   <span className="text-[10px] text-[#8b949e] font-mono opacity-60">ID: {m.id.split('/')[1]}</span>
                 </div>
                 
                 <div className="flex items-center justify-center w-6 h-6">
                   {locked ? (
                     <Lock className="w-3.5 h-3.5 text-[#8b949e]" />
                   ) : isSelected ? (
                     <div className="w-2 h-2 rounded-full bg-[#388bfd] shadow-[0_0_10px_rgba(56,139,253,0.8)]" />
                   ) : (
                     <div className="w-2 h-2 rounded-full bg-[#30363d]" />
                   )}
                 </div>
               </div>
             )
           })}
         </div>

         <div className="p-4 bg-[#161b22]/50 border-t border-[#30363d] flex justify-center">
            <p className="text-[10px] text-[#8b949e] italic text-center leading-tight">
               Switch models to change conversation style and knowledge base.
            </p>
         </div>
      </div>
    </div>
  );
}
