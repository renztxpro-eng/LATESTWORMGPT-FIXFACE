import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useChatStore } from '../chatStore';
import { customPhpApi } from '../services/api';
import { 
  Shield, 
  Activity, 
  MessageSquare, 
  Database, 
  Layers, 
  Calendar, 
  Award, 
  Fingerprint, 
  Terminal,
  HelpCircle,
  TrendingUp,
  Cpu,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const DEFAULT_AVATAR = "https://my-angge.x10.mx/uploads/blue.jpg";

export default function AccountStatusModal({ close, userStatus }: { close: () => void; userStatus: any }) {
  const store = useAppStore();
  const chatStore = useChatStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'technical'>('overview');
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [countdownStr, setCountdownStr] = useState<string>('CALCULATING CYCLE...');
  const [plans, setPlans] = useState<any[]>([]);

  // Load plans price list dynamically to match names and prices
  useEffect(() => {
    customPhpApi('/api/get_price_list.php', null, 'GET')
      .then((res: any) => {
        if (res && res.plans) {
          setPlans(res.plans);
        }
      })
      .catch((e) => console.warn("Failed to load price list in status modal:", e));
  }, []);

  // Load pending transaction if user just subscribed/bought a plan
  useEffect(() => {
    const pStr = localStorage.getItem('wormgpt_pending_payment');
    if (pStr) {
      try {
        setPendingPayment(JSON.parse(pStr));
      } catch (e) {}
    }
  }, [userStatus]);

  // Diagnostic items calculating
  const totalSessions = chatStore.sessions.length;
  const totalMessagesInHistory = chatStore.sessions.reduce(
    (acc, s) => acc + (s.messages ? s.messages.length : 0), 0
  );

  const rawVipLabel = userStatus?.vip_status || '';
  const vipLabel = rawVipLabel && rawVipLabel.toLowerCase() !== 'free' && rawVipLabel.toLowerCase() !== 'guest' ? rawVipLabel : 'FREE ACCESS';
  const isVip = vipLabel !== 'FREE ACCESS' && vipLabel.toLowerCase() !== 'rejected';
  
  // Real subscription plan name (e.g. Silver, Gold, Diamond)
  const subscriptionPlanName = userStatus?.subscription_plan || (isVip ? 'Premium Authorization' : 'Free Tier');
  
  // Find price of the purchased plan matching subscription_plan
  const matchedPlan = plans.find(p => p.name?.toLowerCase() === subscriptionPlanName.toLowerCase());
  const planPrice = matchedPlan ? `₱${Number(matchedPlan.price).toFixed(2)}` : (isVip ? '₱149.00' : 'Free');

  const sentCount = Number(userStatus?.messages_sent || 0);
  const limitCount = Number(userStatus?.message_limit || 0);
  
  const remaining = limitCount > 0 ? Math.max(0, limitCount - sentCount) : Infinity;
  const usagePercentage = limitCount > 0 ? Math.min(100, Math.round((sentCount / limitCount) * 100)) : 0;

  // Real-time ticking subscription expiration countdown timer hook
  useEffect(() => {
    let targetMs: number | null = null;
    
    // 1. Check all possible backend date keys, prioritize subscription_expiry from sync.php
    const dateKeys = [
      'subscription_expiry',
      'expires_at', 
      'expires', 
      'expiry', 
      'premium_expires', 
      'premium_until', 
      'expired_at',
      'payment_expires_at',
      'subscription_expires_at'
    ];
    
    for (const key of dateKeys) {
      if (userStatus?.[key]) {
        const ms = Date.parse(userStatus[key]);
        if (!isNaN(ms)) {
          targetMs = ms;
          break;
        }
        const num = Number(userStatus[key]);
        if (!isNaN(num) && num > 0) {
          const multiplier = num < 9999999999 ? 1000 : 1;
          targetMs = num * multiplier;
          break;
        }
      }
    }

    // 2. Fallback if duration_days exists but no precise expiry date is returned
    if (!targetMs && userStatus?.duration_days && Number(userStatus.duration_days) > 0) {
      const startKeys = ['approved_at', 'payment_approved_at', 'started_at', 'updated_at', 'created_at'];
      let startMs = Date.now();
      for (const sk of startKeys) {
        const src = userStatus?.[sk] || userStatus?.payment?.[sk];
        if (src) {
          const parsed = Date.parse(src);
          if (!isNaN(parsed)) {
            startMs = parsed;
            break;
          }
        }
      }
      targetMs = startMs + Number(userStatus.duration_days) * 24 * 60 * 60 * 1000;
    }

    // 3. If user is VIP but we don't have starting/expiry logs, estimate based on 30-day default
    if (!targetMs && isVip) {
      const days = Number(userStatus?.subscription_duration || userStatus?.duration_days || 30);
      const lastUpdate = Date.parse(userStatus?.updated_at || userStatus?.created_at || '');
      if (!isNaN(lastUpdate)) {
        targetMs = lastUpdate + days * 24 * 60 * 60 * 1000;
      } else {
        targetMs = Date.now() + days * 24 * 60 * 60 * 1000;
      }
    }

    // If no target date found, it's a standard free plan countdown (hours/mins till daily reset midnight local)
    if (!targetMs) {
      const updateFreeReset = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0); // Midnight local reset
        const diff = tomorrow.getTime() - now.getTime();
        
        if (diff <= 0) {
          setCountdownStr("00h 00m 00s (RESETTING CYCLES)");
          return;
        }
        
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        
        const hPad = String(h).padStart(2, '0');
        const mPad = String(m).padStart(2, '0');
        const sPad = String(s).padStart(2, '0');
        
        setCountdownStr(`${hPad}h ${mPad}m ${sPad}s UNTIL DAILY RESET`);
      };
      
      updateFreeReset();
      const interval = setInterval(updateFreeReset, 1000);
      return () => clearInterval(interval);
    }

    // Else we have an active VIP expiration date to countdown
    const updateVipCountdown = () => {
      const diff = targetMs! - Date.now();
      if (diff <= 0) {
        setCountdownStr("EXPIRED (NEEDS SYNCHRONIZATION)");
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      const hPad = String(h).padStart(2, '0');
      const mPad = String(m).padStart(2, '0');
      const sPad = String(s).padStart(2, '0');
      
      if (d > 0) {
        setCountdownStr(`${d}d ${hPad}h ${mPad}m ${sPad}s REMAINING`);
      } else {
        setCountdownStr(`${hPad}h ${mPad}m ${sPad}s REMAINING`);
      }
    };

    updateVipCountdown();
    const interval = setInterval(updateVipCountdown, 1000);
    return () => clearInterval(interval);
  }, [userStatus, isVip]);

  // Expiration label for static print
  let expiryDisplay = 'Lifetime Access Protocol (Permanent Account)';
  if (!isVip) {
    expiryDisplay = 'Standard daily link reset applies (24-hour cycle)';
  } else if (userStatus?.subscription_expiry) {
    expiryDisplay = `Uplink Active until ${userStatus.subscription_expiry}`;
  } else if (userStatus?.duration_days && userStatus?.duration_days > 0) {
    expiryDisplay = `${userStatus.duration_days}-Day Authorization Protocol`;
  } else if (userStatus?.expires_at) {
    expiryDisplay = `Valid until ${userStatus.expires_at}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" onClick={close}>
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-md flex flex-col relative max-h-[90vh] overflow-hidden shadow-2xl scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow effect bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#388bfd] via-[#8957e5] to-[#388bfd]" />
        
        {/* Header */}
        <div className="flex border-b border-[#30363d]/70 px-6 py-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="text-[#388bfd] animate-pulse" size={18} />
            <span className="font-bold text-xs tracking-widest text-[#e6edf3] font-mono uppercase">Neural Identity Diagnostics</span>
          </div>
          <button onClick={close} className="text-[#8b949e] hover:text-white transition-colors p-1 rounded-lg">✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#30363d]/30 px-6 bg-[#161b22]/50">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === 'overview' 
                ? 'border-[#388bfd] text-[#e6edf3]' 
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Diagnostics Summary
          </button>
          <button 
            onClick={() => setActiveTab('technical')}
            className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === 'technical' 
                ? 'border-[#388bfd] text-[#e6edf3]' 
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Encryption Specs
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {activeTab === 'overview' ? (
            <>
              {/* Profile Card */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-[#8957e5]/10 border-b border-l border-[#8957e5]/20 rounded-bl-lg text-[8px] font-bold text-[#8957e5] uppercase font-mono tracking-widest">
                  Active Uplink
                </div>
                <img 
                  src={store.user?.avatarUrl || DEFAULT_AVATAR} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full border border-[#30363d] object-cover p-0.5" 
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[14px] text-[#e6edf3] truncate">{store.user?.username || 'Guest Identity'}</h4>
                  <p className="text-[10px] text-[#8b949e] font-mono truncate leading-tight mt-0.5">{store.user?.email || 'Offline Secure Session'}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isVip ? 'bg-[#d29922]' : 'bg-[#3fb950]'}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isVip ? 'text-[#d29922]' : 'text-[#3fb950]'}`}>
                      {vipLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bought subscription plan details */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
                <span className="text-[9px] text-[#8b949e] uppercase font-mono tracking-widest font-bold block">
                  Active Subscription Tier
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className={`w-5 h-5 ${isVip ? 'text-[#d29922]' : 'text-[#8b949e]'}`} />
                    <div>
                      <h5 className="text-[13px] font-bold text-[#e6edf3] font-sans">
                        {subscriptionPlanName}
                      </h5>
                      <span className="text-[10px] text-[#8b949e] font-mono uppercase block">
                        Cost Value: <span className="text-[#388bfd] font-bold">{planPrice}</span>
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-widest uppercase ${
                    isVip ? 'bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20' : 'bg-[#30363d] text-[#8b949e]'
                  }`}>
                    {isVip ? 'ACTIVE SUBSCRIPTION' : 'FREE USER'}
                  </span>
                </div>
              </div>

              {/* Show pending purchase if detected in localStorage */}
              {pendingPayment && !isVip && (
                <div className="bg-[#1e1a12] border border-[#d29922]/30 rounded-xl p-4 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-[#d29922]/5 rounded-bl-full flex items-center justify-center">
                    <Clock size={12} className="text-[#d29922]/50 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="flex items-center gap-2 text-[#d29922]">
                    <AlertCircle size={14} className="animate-pulse" />
                    <span className="text-[9px] uppercase font-mono tracking-widest font-extrabold">VERIFICATION PENDING ADMIN APPROVAL</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#8b949e]">Bought Plan:</span>
                      <strong className="text-[#e6edf3]">{pendingPayment.planName || 'Premium Core'}</strong>
                    </div>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#8b949e]">Reference #:</span>
                      <strong className="text-[#e6edf3]">{pendingPayment.reference}</strong>
                    </div>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-[#8b949e]">Amount Transmitted:</span>
                      <strong className="text-[#d29922]">₱{Number(pendingPayment.amount).toFixed(2)}</strong>
                    </div>
                  </div>
                  <p className="text-[9px] text-[#8b949e] leading-snug pt-1.5 border-t border-[#30363d]/50">
                    Payment request is currently being verified. Your premium allocation will sync as soon as validation sequence closes.
                  </p>
                </div>
              )}

              {/* Live Expiration Countdown HUD */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2 relative overflow-hidden">
                <span className="text-[9px] text-[#8b949e] uppercase font-mono tracking-widest font-bold block">
                  Uplink Cycle & Countdown Status
                </span>
                
                <div className="flex items-center gap-2.5">
                  <Clock className={`${isVip ? 'text-[#d29922]' : 'text-[#388bfd]'} animate-pulse`} size={16} />
                  <span className="text-sm font-black text-[#e6edf3] font-mono tracking-tight text-glow">
                    {countdownStr}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <Calendar className="text-[#8b949e]" size={11} />
                  <span className="text-[10px] text-[#8b949e] font-mono">
                    {expiryDisplay}
                  </span>
                </div>
              </div>

              {/* Messages Meter */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#8b949e] font-bold uppercase flex items-center gap-1">
                    <Cpu size={12} className="text-[#388bfd]" />
                    Daily Messages Sent
                  </span>
                  <span className="text-[#e6edf3] font-bold">
                    {sentCount} {limitCount > 0 ? `/ ${limitCount}` : '/ Unlimited'}
                  </span>
                </div>
                
                {limitCount > 0 ? (
                  <div className="space-y-1.5">
                    <div className="w-full bg-[#21262d] rounded-full h-2 overflow-hidden border border-[#30363d]/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          usagePercentage > 85 
                            ? 'bg-[#f85149]' 
                            : usagePercentage > 50 
                            ? 'bg-[#d29922]' 
                            : 'bg-[#3fb950]'
                        }`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8b949e] font-mono">
                      <span>{usagePercentage}% Capacity Used</span>
                      <span>{remaining === Infinity ? 'Unlimited' : `${remaining} Cycles Available`}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-1 px-3 bg-[#3fb950]/5 border border-[#3fb950]/20 rounded-lg text-center text-[10px] text-[#3fb950] font-mono uppercase tracking-wider">
                    Unrestricted message limits allocated for this signature
                  </div>
                )}
              </div>

              {/* Dialogue & Core Link Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col items-start gap-1">
                  <Layers className="text-[#388bfd] mb-0.5" size={13} />
                  <span className="text-[8px] text-[#8b949e] uppercase font-mono tracking-widest font-bold">Archives Count</span>
                  <span className="text-xs font-extrabold text-[#e6edf3] font-mono leading-tight">{totalSessions} Core Links</span>
                </div>
                
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col items-start gap-1">
                  <MessageSquare className="text-[#8957e5] mb-0.5" size={13} />
                  <span className="text-[8px] text-[#8b949e] uppercase font-mono tracking-widest font-bold">Dialogue Volume</span>
                  <span className="text-xs font-extrabold text-[#e6edf3] font-mono leading-tight">{totalMessagesInHistory} Messages</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Technical Grid */}
              <div className="space-y-4 font-mono text-xs">
                <div className="bg-[#161b22] border border-[#30363d]/60 rounded-xl p-4 space-y-3">
                  <h5 className="font-bold text-[#e6edf3] uppercase text-[10px] tracking-widest flex items-center gap-2 mb-1 text-[#388bfd]">
                    <Terminal size={14} /> Security Protocol Logs
                  </h5>
                  
                  <div className="divide-y divide-[#30363d]/40 space-y-2.5">
                    <div className="flex justify-between pt-2">
                      <span className="text-[#8b949e]">WormGPT Authority ID</span>
                      <span className="font-bold text-[#e6edf3]">WGPT-@{store.user?.username?.toUpperCase() || 'GUEST'}</span>
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <span className="text-[#8b949e]">Encryption Mode</span>
                      <span className="font-bold text-[#3fb950]">AES-EAX-256 (AES-GCM TLS)</span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-[#8b949e]">Uplink Integrity</span>
                      <span className="font-bold text-[#3fb950] animate-pulse">● SECURED LINK</span>
                    </div>

                    <div className="flex justify-between pt-2">
                      <span className="text-[#8b949e]">Routing Channel</span>
                      <span className="font-bold text-[#e6edf3]">Cloud Router C10</span>
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <span className="text-[#8b949e]">Verification Gateway</span>
                      <span className="font-bold text-[#3fb950]">Secure Cloud Sync Protocol Gateway (TLS v1.3)</span>
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <span className="text-[#8b949e]">Active Cognitive Core</span>
                      <span className="font-bold text-[#388bfd] uppercase break-all max-w-[180px] text-right">
                        {store.settings.selectedModel.split('/').pop()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Core Diagnostics */}
                <div className="bg-[#161b22] border border-[#30363d]/60 rounded-xl p-4">
                  <h5 className="font-bold text-[#e6edf3] uppercase text-[10px] tracking-widest flex items-center gap-2 mb-2 text-[#8957e5]">
                    <Activity size={12} /> System Core Diagnostic Metrics
                  </h5>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#8b949e]">Neural Load Integrity</span>
                        <span className="text-[#3fb950]">Optimal (12ms)</span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#3fb950] h-full" style={{ width: '92%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#8b949e]">Data Packet Delivery</span>
                        <span className="text-[#3fb950]">100% Secure</span>
                      </div>
                      <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#3fb950] h-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-[#30363d]/70 px-6 py-4 bg-[#161b22]/30 flex justify-end">
          <button 
            type="button"
            className="w-full bg-[#21262d] border border-[#30363d] text-[#e6edf3] font-bold text-xs uppercase tracking-widest hover:bg-[#30363d] transition-colors py-3.5 rounded-xl cursor-pointer"
            close-btn="true"
            onClick={close}
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
