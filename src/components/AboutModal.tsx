import React from 'react';
import { Shield, Sparkles, Zap, Terminal, Globe, Cloud, Code } from 'lucide-react';

export default function AboutModal({ close }: { close: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col pt-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#388bfd] via-[#8957e5] to-[#388bfd]" />
        
        <button onClick={close} className="absolute top-4 right-4 text-[#8b949e] hover:text-white transition-colors">✕</button>
        
        <div className="flex flex-col items-center px-6 pb-6 border-b border-[#30363d]/50 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#388bfd]/5 to-transparent pointer-events-none" />
          <div className="w-20 h-20 bg-gradient-to-tr from-[#388bfd] to-[#8957e5] rounded-2xl p-0.5 shadow-lg shadow-[#388bfd]/20 mb-4 transform rotate-3">
            <div className="w-full h-full bg-[#161b22] rounded-[14px] flex items-center justify-center -rotate-3 overflow-hidden">
               <img src="https://my-angge.x10.mx/uploads/blue.jpg" alt="Logo" className="w-full h-full object-cover opacity-90" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e] mb-1 text-center">WormGPT</h2>
          <div className="flex items-center space-x-2 text-sm text-[#388bfd] mb-4">
             <span className="px-2 pb-0.5 pt-[1px] rounded-full bg-[#388bfd]/10 border border-[#388bfd]/20 font-medium tracking-wide text-xs">v3.0 CLOUD</span>
          </div>
          
          <p className="text-sm text-[#8b949e] text-center max-w-xs leading-relaxed">
            The ultimate uncensored AI conversational experience, completely unrestricted and fully customizable.
          </p>
        </div>

        <div className="px-6 py-5 bg-[#161b22]/50 space-y-4 flex-1">
           <div className="grid grid-cols-2 gap-3">
              <FeatureItem icon={<Cloud className="w-4 h-4 text-[#388bfd]" />} title="Cloud Sync" desc="Cross-device history" />
              <FeatureItem icon={<Shield className="w-4 h-4 text-[#8957e5]" />} title="Uncensored" desc="No filters applied" />
              <FeatureItem icon={<Code className="w-4 h-4 text-[#3fb950]" />} title="Code Ready" desc="Syntax highlighting" />
              <FeatureItem icon={<Globe className="w-4 h-4 text-[#d29922]" />} title="OpenRouter" desc="Premium models" />
           </div>
        </div>

        <div className="px-6 py-4 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
           <span className="flex items-center"><Terminal className="w-3.5 h-3.5 mr-1.5 opacity-70" /> Created by Renztxpro</span>
           <span className="px-2 py-1 bg-[#0d1117] rounded border border-[#30363d]">2026 Edition</span>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: any) {
  return (
    <div className="flex items-start space-x-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d] hover:border-[#388bfd]/50 transition-colors">
      <div className="bg-[#161b22] p-1.5 rounded-lg border border-[#30363d]/50 shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[13px] font-semibold text-[#e6edf3] mb-0.5 tracking-tight">{title}</h4>
        <p className="text-[11px] text-[#8b949e] leading-tight">{desc}</p>
      </div>
    </div>
  );
}
