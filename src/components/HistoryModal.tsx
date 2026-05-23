import React, { useState } from 'react';
import { useChatStore } from '../chatStore';
import { useAppStore } from '../store';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoryModal({ close }: any) {
  const chatStore = useChatStore();
  const [search, setSearch] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteCreatedAt, setConfirmDeleteCreatedAt] = useState<number | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const sortedSessions = [...chatStore.sessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastUpdated - a.lastUpdated;
  });

  const filteredSessions = sortedSessions.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.messages.some(m => m.text.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-sm flex flex-col relative max-h-[90vh] h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
         <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#388bfd] via-[#8957e5] to-[#388bfd]" />
         
         <div className="p-4 border-b border-[#30363d] flex justify-between items-center pt-6">
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e]">Chat History</h2>
            <button onClick={close} className="text-[#8b949e] hover:text-white transition-colors">✕</button>
         </div>

         <div className="px-4 py-4 bg-[#161b22]/30">
             <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8b949e] group-focus-within:text-[#388bfd] transition-colors" />
                <input 
                  value={search} onChange={e => setSearch(e.target.value)}
                   className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-[#388bfd]/50 transition-all shadow-inner text-[#e6edf3]"
                  placeholder="Search conversations..."
                />
                {search && <X onClick={() => setSearch('')} className="absolute right-3 top-2.5 w-4 h-4 text-[#8b949e] cursor-pointer hover:text-white" />}
             </div>
         </div>

         <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 mt-2">
            {filteredSessions.length === 0 ? (
               <div className="text-center py-20 bg-[#161b22]/20 rounded-2xl border border-dashed border-[#30363d] text-[#8b949e] text-sm">
                  No conversations found
               </div>
            ) : filteredSessions.map((s, idx) => {
               const originalIndex = chatStore.sessions.indexOf(s);
               const isActive = originalIndex === chatStore.currentSessionIndex;

               return (
                 <div key={idx} onClick={() => { if (editingIndex !== originalIndex) { chatStore.setCurrentSessionIndex(originalIndex); close(); } }} className={cn("bg-[#161b22] border rounded-xl overflow-hidden cursor-pointer transition-all hover:bg-[#1c2128]", s.isPinned ? "border-[#d29922]/50" : "border-[#30363d]")}>
                   <div className="p-3">
                     <div className="flex justify-between items-center mb-1 gap-2">
                        {editingIndex === originalIndex ? (
                           <input 
                             autoFocus
                             className="flex-1 bg-[#0d1117] border border-[#388bfd] rounded px-2 py-1 text-sm outline-none text-[#e6edf3]"
                             value={editTitle}
                             onClick={e => e.stopPropagation()}
                             onChange={e => setEditTitle(e.target.value)}
                             onKeyDown={e => {
                                if (e.key === 'Enter') {
                                   if (editTitle.trim() && editTitle !== s.title) {
                                      chatStore.updateSession(originalIndex, {...s, title: editTitle.trim()});
                                   }
                                   setEditingIndex(null);
                                } else if (e.key === 'Escape') {
                                   setEditingIndex(null);
                                }
                             }}
                             onBlur={() => {
                                if (editTitle.trim() && editTitle !== s.title) {
                                   chatStore.updateSession(originalIndex, {...s, title: editTitle.trim()});
                                }
                                setEditingIndex(null);
                             }}
                           />
                        ) : (
                           <h4 className={cn("text-sm font-semibold truncate", s.isPinned ? "text-[#d29922]" : "text-[#e6edf3]")}>
                              {s.isPinned && "★ "}
                              {s.title}
                           </h4>
                        )}
                        {editingIndex !== originalIndex && isActive && <span className="text-[9px] px-1.5 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 rounded text-[#3fb950] shrink-0 font-bold uppercase tracking-wider">Active</span>}
                     </div>
                     <div className="text-[11px] text-[#8b949e] mb-2 flex items-center gap-2">
                        <span className="opacity-70">{s.messages.length} messages</span>
                        <span className="w-1 h-1 bg-[#30363d] rounded-full" />
                        <span className="opacity-70">{new Date(s.lastUpdated).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                     </div>
                     {s.messages.length > 0 && (
                        <p className="text-[11px] text-[#8b949e]/80 truncate font-mono italic opacity-60">"{s.messages[0].text}"</p>
                     )}
                   </div>
                   <div className="flex justify-end gap-3 px-3 pb-3 border-t border-[#30363d]/50 pt-2 min-h-[38px] items-center">
                      {confirmDeleteCreatedAt === s.createdAt ? (
                         <>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#f85149] mr-auto">Confirm delete?</span>
                            <button onClick={async e => {
                               e.stopPropagation();
                               const sessionToDelete = s;
                               const store = useAppStore.getState();
                               
                               if (store.user && store.user.id && !store.user.id.startsWith('offline_')) {
                                  const toastId = toast.loading('Deleting chat from cloud...');
                                  try {
                                     const resp = await api.deleteSession(Number(store.user.id), store.user.token, sessionToDelete.createdAt);
                                     toast.dismiss(toastId);
                                     chatStore.deleteSession(originalIndex);
                                     toast.success('Chat deleted from cloud');
                                  } catch (err) {
                                     toast.dismiss(toastId);
                                     chatStore.deleteSession(originalIndex);
                                     toast.success('Chat deleted locally');
                                  }
                               } else {
                                  chatStore.deleteSession(originalIndex);
                                  toast.success('Chat deleted locally');
                               }
                               setConfirmDeleteCreatedAt(null);
                            }} className="text-[10px] font-black uppercase tracking-wider text-[#2ea44f] hover:text-[#2ea44f]/80 transition-colors">Yes</button>
                            <button onClick={e => {
                               e.stopPropagation();
                               setConfirmDeleteCreatedAt(null);
                            }} className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e] hover:text-white transition-colors">No</button>
                         </>
                      ) : (
                         <>
                            <button onClick={e => {
                               e.stopPropagation();
                               chatStore.updateSession(originalIndex, {...s, isPinned: !s.isPinned});
                            }} className={cn("text-[10px] font-bold uppercase tracking-tighter hover:opacity-80 transition-opacity", s.isPinned ? "text-[#d29922]" : "text-[#8b949e]")}>
                              {s.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button onClick={e => {
                               e.stopPropagation();
                               setEditingIndex(originalIndex);
                               setEditTitle(s.title);
                            }} className="text-[10px] font-bold uppercase tracking-tighter text-[#388bfd] hover:opacity-80 transition-opacity">Rename</button>
                            <button onClick={e => {
                               e.stopPropagation();
                               setConfirmDeleteCreatedAt(s.createdAt);
                            }} className="text-[10px] font-bold uppercase tracking-tighter text-[#f85149] hover:opacity-80 transition-opacity">Delete</button>
                         </>
                      )}
                   </div>
                 </div>
               )
            })}
         </div>

         <div className="p-4 border-t border-[#30363d] flex justify-between items-center bg-[#161b22]/50">
            {confirmClearAll ? (
               <>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#f85149]">Delete ALL chats?</span>
                  <div className="flex gap-2">
                     <button 
                        onClick={async () => {
                           const store = useAppStore.getState();
                           if (store.user && store.user.id && !store.user.id.startsWith('offline_')) {
                              const toastId = toast.loading('Deleting all chats from cloud...');
                              try {
                                 await api.deleteAllSessions(Number(store.user.id), store.user.token);
                                 toast.dismiss(toastId);
                                 chatStore.clearAllSessions();
                                 toast.success('All chats deleted from cloud');
                                 close();
                              } catch (err) {
                                 toast.dismiss(toastId);
                                 chatStore.clearAllSessions();
                                 toast.success('All chats deleted locally');
                                 close();
                              }
                           } else {
                              chatStore.clearAllSessions();
                              toast.success('All chats deleted locally');
                              close();
                           }
                           setConfirmClearAll(false);
                        }} 
                        className="text-[10px] font-black uppercase tracking-widest text-white bg-[#f85149] py-1 px-2.5 rounded hover:bg-[#f85149]/90 transition-all"
                     >
                        Confirm
                     </button>
                     <button 
                        onClick={() => setConfirmClearAll(false)} 
                        className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e] py-1 px-2.5 rounded border border-[#30363d] bg-[#0d1117] hover:border-[#8b949e] transition-all"
                     >
                        Cancel
                     </button>
                  </div>
               </>
            ) : (
               <>
                  <button onClick={() => setConfirmClearAll(true)} className="text-[10px] font-bold uppercase tracking-widest text-[#f85149] py-1.5 px-3 rounded hover:bg-[#f85149]/10 transition-all">Clear All</button>
                  <button onClick={close} className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e] py-1.5 px-3 rounded border border-[#30363d] bg-[#0d1117] hover:border-[#8b949e] transition-all">Close</button>
               </>
            )}
         </div>
      </div>
    </div>
  );
}
