import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { toast } from 'sonner';
import { customPhpApi } from '../services/api';
import { ArrowLeft } from 'lucide-react';

export default function SubscriptionModal({ close }: any) {
  const store = useAppStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'plans' | 'methods' | 'pay' | 'success'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    customPhpApi('/api/get_price_list.php', null, 'GET').then((res: any) => {
      setPlans(res.plans || []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const loadPaymentMethods = (plan: any) => {
    setLoading(true);
    setSelectedPlan(plan);
    customPhpApi('/api/get_payment_methods.php', null, 'GET').then((res: any) => {
      setPaymentMethods(res.methods || []);
      setStep('methods');
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast.error('Failed to load payment methods');
    });
  };

  const handlePay = () => {
    if (!reference) return toast.error('Please enter reference number');
    
    setSubmitting(true);
    customPhpApi('/api/submit_payment_request.php', {
      user_id: Number(store.user?.id),
      plan_id: selectedPlan.id,
      amount: selectedPlan.price,
      payment_method_id: selectedMethod.id,
      reference_number: reference,
      proof_image: ''
    }).then((res: any) => {
      setSubmitting(false);
      if (res.success) {
        toast.success('Payment request submitted!');
        localStorage.setItem('wormgpt_pending_payment', JSON.stringify({
          userId: store.user?.id,
          reference: reference,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          submittedAt: Date.now(),
          status: 'pending'
        }));
        setStep('success');
      } else {
        toast.error(res.message || 'Failed to submit request');
      }
    }).catch(() => {
      setSubmitting(false);
      toast.error('Connection failed');
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
      onClick={() => {
        if (step !== 'success') close();
      }}
    >
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-sm flex flex-col relative max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
         <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#388bfd] via-[#8957e5] to-[#388bfd]" />
         
         {step !== 'success' && (
           <button onClick={close} className="absolute top-4 right-4 text-[#8b949e] hover:text-white transition-colors z-10">✕</button>
         )}
         
         <div className="flex-1 overflow-y-auto w-full flex flex-col p-6 pt-10">
           {step === 'plans' && (
             <>
               <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e] mb-6 text-center leading-tight">Elevate Your<br/>Intelligence</h2>
               
               {loading && <div className="text-center py-10 text-[#8b949e] italic animate-pulse tracking-widest text-xs">SCANNING PRICE LIST...</div>}
               
               <div className="space-y-4">
                 {plans.map(p => (
                   <div key={p.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col items-center relative group hover:border-[#388bfd]/50 transition-all">
                      <div className="absolute top-0 right-0 px-3 py-1 bg-[#388bfd]/10 border-b border-l border-[#388bfd]/20 rounded-bl-xl text-[9px] font-bold text-[#388bfd] uppercase tracking-widest">Selected</div>
                      
                      <h3 className="text-[#e6edf3] font-bold text-xl mb-1 tracking-tight">{p.name}</h3>
                      <div className="text-[#d29922] font-black text-2xl mb-4 tabular-nums">₱{Number(p.price).toFixed(2)}</div>
                      
                      <div className="w-full space-y-2 mb-6 flex flex-col items-center">
                         <div className="flex items-center justify-center text-[11px] text-[#8b949e]">
                            <span className="w-1.5 h-1.5 bg-[#3fb950] rounded-full mr-2" />
                            {p.daily_message_limit === 0 ? 'Unlimited Message Limit' : `${p.daily_message_limit} Messages / Day`}
                         </div>
                         <div className="flex items-center justify-center text-[11px] text-[#8b949e]">
                            <span className="w-1.5 h-1.5 bg-[#388bfd] rounded-full mr-2" />
                            {p.duration_days === 0 ? 'Permanent Access' : `${p.duration_days} Day Access Plan`}
                         </div>
                      </div>

                      <button 
                        onClick={() => loadPaymentMethods(p)}
                        className="w-full bg-[#388bfd] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#388bfd]/20 hover:bg-[#388bfd]/90 transition-all"
                      >
                        Initialize Upgrade
                      </button>
                   </div>
                 ))}
               </div>
             </>
           )}

           {step === 'methods' && (
             <>
               <div className="flex items-center mb-6 text-[#388bfd] font-bold">
                 <button onClick={() => setStep('plans')} className="p-2 -ml-2 hover:bg-[#161b22] rounded-full transition-colors"><ArrowLeft size={18} /></button>
                 <span className="flex-1 text-center pr-8 text-sm uppercase tracking-widest">Select Gateway</span>
               </div>
               
               <div className="text-center mb-8 p-4 bg-[#161b22] rounded-2xl border border-[#30363d]/50">
                 <div className="text-xs text-[#8b949e] uppercase tracking-widest mb-1">Contract: {selectedPlan.name}</div>
                 <div className="text-2xl text-[#e6edf3] font-black">₱{Number(selectedPlan.price).toFixed(2)}</div>
               </div>

               {loading && <div className="text-center py-10 text-[#8b949e] italic text-xs tracking-widest">LOCATING GATEWAYS...</div>}
               
               <div className="space-y-3">
                 {paymentMethods.map(m => (
                   <div key={m.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col hover:border-[#3fb950]/50 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="text-[#e6edf3] font-bold text-sm tracking-tight flex items-center gap-2">
                           <span className="p-1.5 bg-[#0d1117] rounded-lg border border-[#30363d] group-hover:border-[#3fb950]/30 transition-colors">
                              {m.method_type === 'qr' ? '📱' : '🔗'}
                            </span>
                            {m.title}
                         </h3>
                      </div>
                      
                      {m.description && <p className="text-[11px] text-[#8b949e] mb-2 leading-relaxed opacity-70">{m.description}</p>}
                      {m.account_details && (
                         <div className="text-[10px] text-[#388bfd] font-mono mb-4 px-2 py-1 bg-[#388bfd]/5 rounded border border-[#388bfd]/20 truncate">
                            {m.account_details}
                         </div>
                      )}
                      
                      <button 
                        onClick={() => { setSelectedMethod(m); setStep('pay'); }}
                        className="w-full bg-[#161b22] hover:bg-[#3fb950] text-[#3fb950] hover:text-white border border-[#3fb950]/50 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Establish Connection
                      </button>
                   </div>
                 ))}
               </div>
             </>
           )}

           {step === 'pay' && (
             <>
               <div className="flex items-center mb-6 text-[#388bfd] font-bold">
                 <button onClick={() => setStep('methods')} className="p-2 -ml-2 hover:bg-[#161b22] rounded-full transition-colors"><ArrowLeft size={18} /></button>
                 <span className="flex-1 text-center pr-8 text-sm uppercase tracking-widest">Protocol Execution</span>
               </div>
               
               <div className="text-center mb-6">
                 <div className="text-[10px] text-[#8b949e] uppercase tracking-widest mb-1">Requiring Payment</div>
                 <div className="text-3xl text-[#e6edf3] font-black">₱{Number(selectedPlan.price).toFixed(2)}</div>
               </div>

               <div className="flex-1 p-4 bg-[#0d1117] rounded-3xl border border-[#30363d] mb-6 flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-[#388bfd]/5 to-transparent pointer-events-none" />
                 
                 {selectedMethod.method_type === 'qr' && selectedMethod.qr_code_url ? (
                   <>
                     <div className="bg-white p-3 rounded-2xl mb-4 inline-block shadow-2xl">
                       <img src={selectedMethod.qr_code_url} alt="QR Code" className="w-44 h-44 object-contain" />
                     </div>
                     <p className="text-[11px] text-[#8b949e] text-center px-4 leading-relaxed font-medium">
                        Capture the code above with your mobile terminal to transmit the required funds.
                     </p>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center p-4 h-full text-center">
                     <p className="text-[11px] text-[#8b949e] mb-6 leading-relaxed">
                        Redirect sequence prepared. You must authorize the transaction through the external gateway.
                     </p>
                     {selectedMethod.payment_link && (
                       <button onClick={() => window.open(selectedMethod.payment_link, '_blank')} className="px-6 py-3 bg-[#388bfd] rounded-xl text-white text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-[#388bfd]/20 transition-all active:scale-95">
                          OPEN SECURE LINK
                       </button>
                     )}
                   </div>
                 )}
               </div>

               <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-[#8b949e] mb-1.5 block uppercase tracking-tighter">Transmission Reference</label>
                    <input 
                      placeholder="ENTER REF #" 
                      value={reference} onChange={e => setReference(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#388bfd] transition-all font-mono"
                    />
                 </div>
                 <button 
                   onClick={handlePay}
                   disabled={submitting || !reference}
                   className="w-full bg-[#3fb950] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest disabled:opacity-30 shadow-lg shadow-[#3fb950]/10 transition-all animate-pulse-slow"
                 >
                   {submitting ? 'VALIDATING...' : 'SUBMIT PROTOCOL'}
                 </button>
               </div>
             </>
           )}

           {step === 'success' && (
             <div className="flex flex-col items-center text-center justify-center py-6">
               <div className="w-16 h-16 bg-[#238636]/10 border border-[#23aa3f]/30 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_20px_rgba(63,185,80,0.15)]">
                 <span className="text-3xl">⏳</span>
               </div>
               
               <h2 className="text-xl font-extrabold text-[#e6edf3] mb-3 tracking-tight leading-tight uppercase font-sans">
                 Transmission Pending
               </h2>
               
               <p className="text-xs text-[#8b949e] mb-6 px-1 leading-relaxed">
                 Your reference identifier has been successfully broadcast to the network. Please wait patiently while our administrator verifies the transmission.
               </p>

               <div className="w-full bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6 text-left">
                 <div className="flex justify-between text-[11px] mb-2 border-b border-[#30363d]/50 pb-2 font-sans">
                   <span className="text-[#8b949e]">Reference Number</span>
                   <span className="font-mono text-[#e6edf3] font-bold">{reference}</span>
                 </div>
                 <div className="flex justify-between text-[11px] mb-2 border-b border-[#30363d]/50 pb-2 font-sans">
                   <span className="text-[#8b949e]">Upgrade Plan</span>
                   <span className="text-[#e6edf3] font-semibold">{selectedPlan?.name}</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-sans">
                   <span className="text-[#8b949e]">Status</span>
                   <span className="text-[#d29922] font-black uppercase tracking-wider animate-pulse font-mono">Pending Admin Approve</span>
                 </div>
               </div>

               <button 
                 onClick={close}
                 className="w-full bg-[#388bfd] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#388bfd]/20 hover:bg-[#388bfd]/90 transition-all font-sans"
               >
                 Confirm & Dismiss
               </button>
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
