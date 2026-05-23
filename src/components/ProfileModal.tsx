import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { toast } from 'sonner';
import { api } from '../services/api';
import { Eye, EyeOff, Fingerprint, Camera, Loader2, QrCode } from 'lucide-react';
import BiometricScanner from './BiometricScanner';
import { cn } from '../lib/utils';
import { addBiometricLinkedUser, removeBiometricLinkedUser } from '../lib/biometricUtils';

function PasswordInput({ value, onChange, placeholder, className }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className || ''}`}>
      <input 
        className="w-full bg-[#21262d] border border-[#30363d] rounded-lg p-3 text-sm focus:outline-none pr-10" 
        placeholder={placeholder} 
        type={show ? "text" : "password"}
        value={value} 
        onChange={onChange}
      />
      <button 
        type="button" 
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

const compressImage = (file: File, maxWidth = 256, maxHeight = 256, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;

        const size = Math.min(width, height);
        const xOffset = (width - size) / 2;
        const yOffset = (height - size) / 2;

        canvas.width = maxWidth;
        canvas.height = maxHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, maxWidth, maxHeight);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function ProfileModal({ close }: any) {
  const store = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileForm, setProfileForm] = useState({
    fullname: store.user?.fullname || '',
    username: store.user?.username || '',
    email: store.user?.email || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const [deleteForm, setDeleteForm] = useState({ password: '' });
  
  const [mode, setMode] = useState<'profile' | 'password' | 'delete'>('profile');

  const [showScanner, setShowScanner] = useState(false);
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [activeScanType, setActiveScanType] = useState<'finger' | 'face'>('finger');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showQrToken, setShowQrToken] = useState(false);

  React.useEffect(() => {
    const checkUserBiometrics = async () => {
      try {
        if (store.user?.username) {
          const res = await api.checkBiometrics(store.user.username);
          if (res.success && res.registered && res.user) {
            setHasFingerprint(!!res.user.credId);
            setHasFace(!!res.user.hasFaceImage);
            
            const bioPayload = {
              id: store.user.id,
              token: store.user.token,
              username: store.user.username,
              email: store.user.email,
              fullname: store.user.fullname,
              avatarUrl: store.user.avatarUrl,
              credId: res.user.credId,
              faceImage: res.user.hasFaceImage ? "registered" : undefined
            };
            addBiometricLinkedUser(bioPayload);
          } else {
            setHasFingerprint(false);
            setHasFace(false);
            removeBiometricLinkedUser(store.user.username);
          }
        }
      } catch (err) {
        console.warn("Central check failure, fallback to localStorage:", err);
        try {
          const stored = localStorage.getItem('biometric_linked_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.id === store.user?.id) {
              setHasFingerprint(!!parsed.credId);
              setHasFace(!!parsed.faceImage);
            }
          }
        } catch (e) {}
      } finally {
        setLoadingStatus(false);
      }
    };
    checkUserBiometrics();
  }, [store.user?.username, store.user?.id, store.user?.token]);

  const handleRevokeFingerprint = async () => {
    const revToast = toast.loading("Revoking fingerprint credentials...");
    try {
      const bioPayload = {
        id: store.user?.id,
        token: store.user?.token,
        username: store.user?.username,
        email: store.user?.email,
        fullname: store.user?.fullname,
        avatarUrl: store.user?.avatarUrl
      };
      const res = await api.registerBiometrics(bioPayload, 0, undefined, "revoke", undefined);
      if (res.success) {
        setHasFingerprint(false);
        const stored = localStorage.getItem('biometric_linked_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            delete parsed.credId;
            if (!parsed.credId && !parsed.faceImage) {
              removeBiometricLinkedUser(store.user?.username || '');
            } else {
              addBiometricLinkedUser(parsed);
            }
          } catch (e) {}
        }
        toast.dismiss(revToast);
        toast.success("Fingerprint signature successfully revoked.");
      } else {
        toast.dismiss(revToast);
        toast.error("Failed to revoke signature on server.");
      }
    } catch (err) {
      toast.dismiss(revToast);
      toast.error("Error revoking biometric credentials.");
    }
  };

  const handleRevokeFace = async () => {
    const revToast = toast.loading("Revoking Face ID templates...");
    try {
      const bioPayload = {
        id: store.user?.id,
        token: store.user?.token,
        username: store.user?.username,
        email: store.user?.email,
        fullname: store.user?.fullname,
        avatarUrl: store.user?.avatarUrl
      };
      const res = await api.registerBiometrics(bioPayload, 1, undefined, undefined, "revoke");
      if (res.success) {
        setHasFace(false);
        const stored = localStorage.getItem('biometric_linked_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            delete parsed.faceImage;
            if (!parsed.credId && !parsed.faceImage) {
              removeBiometricLinkedUser(store.user?.username || '');
            } else {
              addBiometricLinkedUser(parsed);
            }
          } catch (e) {}
        }
        toast.dismiss(revToast);
        toast.success("Face template successfully revoked.");
      } else {
        toast.dismiss(revToast);
        toast.error("Failed to revoke template on server.");
      }
    } catch (err) {
      toast.dismiss(revToast);
      toast.error("Error revoking Face ID template.");
    }
  };

  const handleToggleBiometrics = (type: 'finger' | 'face') => {
    if (type === 'finger' && hasFingerprint) {
      handleRevokeFingerprint();
    } else if (type === 'face' && hasFace) {
      handleRevokeFace();
    } else {
      setActiveScanType(type);
      setShowScanner(true);
    }
  };

  const handleRegisterSuccess = async (userData?: any, keyIndex?: number, devicePin?: string, credId?: string, faceImage?: string) => {
    try {
      const bioPayload = {
        id: store.user?.id,
        token: store.user?.token,
        username: store.user?.username,
        email: store.user?.email,
        fullname: store.user?.fullname,
        avatarUrl: store.user?.avatarUrl,
        biometricKeyIndex: keyIndex !== undefined ? Number(keyIndex) : 0,
        devicePin: devicePin,
        credId: activeScanType === 'finger' ? credId : undefined,
        faceImage: activeScanType === 'face' ? faceImage : undefined
      };
      
      const res = await api.registerBiometrics(bioPayload, keyIndex !== undefined ? Number(keyIndex) : 0, devicePin, bioPayload.credId, bioPayload.faceImage);
      if (res.success) {
        if (activeScanType === 'finger') {
          setHasFingerprint(true);
        } else {
          setHasFace(true);
        }
        
        let localObj: any = {};
        const stored = localStorage.getItem('biometric_linked_user');
        if (stored) {
          try {
            localObj = JSON.parse(stored);
          } catch (e) {}
        }
        localObj = {
          ...localObj,
          id: store.user?.id,
          token: store.user?.token,
          username: store.user?.username,
          email: store.user?.email,
          fullname: store.user?.fullname,
          avatarUrl: store.user?.avatarUrl,
          credId: activeScanType === 'finger' ? credId : localObj.credId,
          faceImage: activeScanType === 'face' ? (faceImage || localObj.faceImage) : localObj.faceImage
        };
        addBiometricLinkedUser(localObj);
        
        setShowScanner(false);
        toast.success(`${activeScanType === 'finger' ? 'Fingerprint' : 'Face ID'} signature synchronized successfully on the node database!`);
      } else {
        toast.error("Failed to register biometric signature on server.");
      }
    } catch (err) {
      toast.error("Failed to register biometric signature on node server.");
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.username || !profileForm.email) {
      return toast.error("Username and Email are required");
    }
    try {
      const res = await api.updateProfile(
        Number(store.user!.id), 
        store.user!.token, 
        profileForm.fullname, 
        profileForm.username, 
        profileForm.email
      );
      if (res.success) {
        store.updateUser({ ...store.user, ...profileForm });
        toast.success("Profile updated");
      } else {
        toast.error(res.message || "Update failed");
      }
    } catch (e) {
      toast.error("Connection failed");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      return toast.error("All fields required");
    }
    if (passwordForm.newPass.length < 4) {
      return toast.error("Password must be at least 4 characters");
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      return toast.error("Passwords don't match");
    }

    try {
      const res = await api.changePassword(
        Number(store.user!.id), 
        store.user!.token, 
        passwordForm.current, 
        passwordForm.newPass
      );
      if (res.success) {
        toast.success("Password changed!");
        setMode('profile');
        setPasswordForm({ current: '', newPass: '', confirm: '' });
      } else {
        toast.error(res.message || "Failed");
      }
    } catch (e) {
      toast.error("Connection failed");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteForm.password) return toast.error("Enter password");
    try {
      const res = await api.deleteAccount(
        Number(store.user!.id), 
        store.user!.token, 
        deleteForm.password
      );
      if (res.success) {
        store.logout();
        toast.success("Account deleted");
        close();
      } else {
        toast.error(res.message || "Failed");
      }
    } catch (e) {
      toast.error("Connection failed");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading("Compressing and optimizing image...");
    let compressedFile: File;
    try {
      compressedFile = await compressImage(file);
    } catch (err) {
      compressedFile = file; // fallback
    }

    const formData = new FormData();
    formData.append('user_id', store.user!.id);
    formData.append('token', store.user!.token);
    formData.append('avatar', compressedFile, 'avatar.jpg');

    try {
      toast.loading("Uploading optimized avatar...", { id: loadingToast });
      const response = await fetch('/api/proxy/php/upload_avatar.php', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      
      if (result.success) {
        store.updateUser({ ...store.user, avatarUrl: result.avatar_url });
        toast.success("Profile picture updated and uploaded instantly!", { id: loadingToast });
      } else {
        toast.error("Upload failed", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Upload failed", { id: loadingToast });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-sm flex flex-col relative max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
         <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#388bfd] via-[#8957e5] to-[#388bfd]" />
         
         <button onClick={close} className="absolute top-4 right-4 text-[#8b949e] hover:text-white transition-colors z-10">✕</button>
         
         <div className="overflow-y-auto p-6 flex flex-col pt-10">
           {mode === 'profile' && (
             <>
               <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e] mb-6 text-center">Identity Details</h2>
               
               <div className="flex flex-col items-center mb-8 relative">
                 <div className="relative group cursor-pointer p-1 rounded-full bg-gradient-to-tr from-[#388bfd] to-[#8957e5]" onClick={() => fileInputRef.current?.click()}>
                   <div className="w-20 h-20 rounded-full border-2 border-[#0d1117] overflow-hidden bg-[#161b22]">
                     <img 
                      src={store.user?.avatarUrl || "https://my-angge.x10.mx/uploads/blue.jpg"} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                     />
                   </div>
                   <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] text-white font-bold uppercase tracking-widest text-center px-1">Change<br/>Photo</span>
                   </div>
                 </div>
                 <input
                   type="file"
                   ref={fileInputRef}
                   className="hidden"
                   accept="image/*"
                   onChange={handleAvatarChange}
                 />
                 <div className="mt-2 px-2 py-0.5 rounded-full bg-[#388bfd]/10 border border-[#388bfd]/20 text-[10px] font-bold text-[#388bfd]">
                    {store.user?.username.toUpperCase()}
                 </div>
               </div>

               <div className="w-full space-y-4">
                  <div className="bg-[#161b22]/50 p-1 rounded-xl border border-[#30363d]/50">
                     <label className="text-[10px] font-bold text-[#8b949e] px-3 pt-2 block uppercase tracking-wider">Full Name</label>
                     <input className="w-full bg-transparent p-3 pt-1 text-sm focus:outline-none text-[#e6edf3]" value={profileForm.fullname} onChange={e => setProfileForm({...profileForm, fullname: e.target.value})} />
                  </div>
                  <div className="bg-[#161b22]/50 p-1 rounded-xl border border-[#30363d]/50">
                     <label className="text-[10px] font-bold text-[#8b949e] px-3 pt-2 block uppercase tracking-wider">Username</label>
                     <input className="w-full bg-transparent p-3 pt-1 text-sm focus:outline-none text-[#e6edf3]" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} />
                  </div>
                  <div className="bg-[#161b22]/50 p-1 rounded-xl border border-[#30363d]/50">
                     <label className="text-[10px] font-bold text-[#8b949e] px-3 pt-2 block uppercase tracking-wider">Email Address</label>
                     <input className="w-full bg-transparent p-3 pt-1 text-sm focus:outline-none text-[#e6edf3]" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} type="email" />
                  </div>
                  
                  <div className="bg-[#161b22]/50 p-3 rounded-xl border border-[#30363d]/50 space-y-4">
                     <label className="text-[10px] font-bold text-[#8b949e] block uppercase tracking-wider">Device Keys Security</label>
                     
                     <div className="flex items-center justify-between border-b border-[#30363d]/30 pb-3">
                        <div className="flex items-center gap-2">
                           <Fingerprint className={cn("w-4 h-4", hasFingerprint ? "text-[#8957e5] animate-pulse" : "text-[#8b949e]")} />
                           <div className="flex flex-col">
                              <span className="text-xs font-semibold text-[#e6edf3]">Fingerprint TouchID</span>
                              <span className="text-[9px] text-[#8b949e]">
                                 {hasFingerprint ? "Enrolled securely" : "Not linked"}
                              </span>
                           </div>
                        </div>
                        <button
                           type="button"
                           onClick={() => handleToggleBiometrics('finger')}
                           className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition-all active:scale-95",
                              hasFingerprint
                                 ? "bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149] hover:bg-[#f85149]/20"
                                 : "bg-[#8957e5]/10 border-[#8957e5]/30 text-[#8957e5] hover:bg-[#8957e5]/25"
                           )}
                        >
                           {hasFingerprint ? "Revoke Finger" : "Link Finger"}
                        </button>
                     </div>

                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Camera className={cn("w-4 h-4", hasFace ? "text-[#388bfd] animate-pulse" : "text-[#8b949e]")} />
                           <div className="flex flex-col">
                              <span className="text-xs font-semibold text-[#e6edf3]">Face Recognition ID</span>
                              <span className="text-[9px] text-[#8b949e]">
                                 {hasFace ? "Registered template" : "Not registered"}
                              </span>
                           </div>
                        </div>
                        <button
                           type="button"
                           onClick={() => handleToggleBiometrics('face')}

                           className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition-all active:scale-95",
                              hasFace
                                 ? "bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149] hover:bg-[#f85149]/20"
                                 : "bg-[#388bfd]/10 border-[#388bfd]/30 text-[#388bfd] hover:bg-[#388bfd]/25"
                           )}
                        >
                           {hasFace ? "Revoke Face ID" : "Link Face ID"}
                        </button>
                     </div>

                      <div className="border-t border-[#30363d]/30 pt-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <QrCode className={cn("w-4 h-4", showQrToken ? "text-[#58a6ff]" : "text-[#8b949e]")} />
                              <div className="flex flex-col">
                                 <span className="text-xs font-semibold text-[#e6edf3]">Personal QR Code</span>
                                 <span className="text-[9px] text-[#8b949e]">Scan on other nodes to login</span>
                              </div>
                           </div>
                           <button
                              type="button"
                              onClick={() => setShowQrToken(prev => !prev)}
                              className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border bg-[#388bfd]/10 border-[#388bfd]/30 text-[#388bfd] hover:bg-[#388bfd]/20 cursor-pointer select-none transition-all active:scale-95"
                           >
                              {showQrToken ? "Hide Key" : "View QR Key"}
                           </button>
                        </div>
                        
                        {showQrToken && (
                          <div className="flex flex-col items-center p-3 bg-black/60 rounded-xl border border-[#30363d]/50">
                            <span className="text-[8px] font-mono text-[#8b949e] uppercase tracking-widest mb-1.5">SECURE PORTABLE QR PASSPORT</span>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=58a6ff&bgcolor=0d1117&data=${encodeURIComponent(JSON.stringify({
                                type: 'auth_qr',
                                id: store.user?.id,
                                username: store.user?.username,
                                token: store.user?.token,
                                email: store.user?.email,
                                fullname: store.user?.fullname,
                                avatarUrl: store.user?.avatarUrl
                              }))}`}
                              alt="Secure Login QR Code"
                              className="w-36 h-36 border border-[#30363d] rounded-lg p-1.5 bg-[#0d1117]"
                              referrerPolicy="no-referrer"
                            />
                            <a
                              href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=58a6ff&bgcolor=0d1117&data=${encodeURIComponent(JSON.stringify({
                                type: 'auth_qr',
                                id: store.user?.id,
                                username: store.user?.username,
                                token: store.user?.token,
                                email: store.user?.email,
                                fullname: store.user?.fullname,
                                avatarUrl: store.user?.avatarUrl
                              }))}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[8px] font-bold text-[#388bfd] hover:underline uppercase tracking-wide mt-2"
                            >
                              Open Fullscreen QR
                            </a>
                          </div>
                        )}
                      </div>

                     {showScanner && (
                        <BiometricScanner 
                           mode="register" 
                           username={store.user?.username} 
                           defaultScanType={activeScanType}
                           onSuccess={handleRegisterSuccess} 
                           onCancel={() => setShowScanner(false)} 
                        />
                     )}
                  </div>
               </div>

               <div className="mt-8 flex flex-col items-center space-y-4">
                   <button onClick={() => setMode('password')} className="text-xs font-bold text-[#388bfd] hover:text-[#388bfd]/80 transition-colors uppercase tracking-widest">Change Password</button>
                   <button onClick={handleUpdateProfile} className="bg-[#388bfd] text-white w-full rounded-xl py-3.5 font-bold text-sm shadow-lg shadow-[#388bfd]/20 hover:bg-[#388bfd]/90 transition-all active:scale-[0.98]">COMMIT CHANGES</button>
                   
                   <div className="w-full border-t border-[#30363d]/50 pt-4 flex justify-center">
                       <button className="text-[10px] font-bold text-[#f85149] uppercase tracking-widest hover:underline" onClick={() => setMode('delete')}>Delete Identity</button>
                   </div>
               </div>
             </>
           )}

           {mode === 'password' && (
             <>
               <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e] mb-6 text-center">Security Access</h2>
               <div className="w-full space-y-4 mb-8">
                  <PasswordInput placeholder="Current Secret" value={passwordForm.current} onChange={(e: any) => setPasswordForm({...passwordForm, current: e.target.value})} />
                  <PasswordInput placeholder="New Secret" value={passwordForm.newPass} onChange={(e: any) => setPasswordForm({...passwordForm, newPass: e.target.value})} />
                  <PasswordInput placeholder="Verify New Secret" value={passwordForm.confirm} onChange={(e: any) => setPasswordForm({...passwordForm, confirm: e.target.value})} />
               </div>
               
               <button onClick={handleChangePassword} className="bg-[#388bfd] text-white w-full rounded-xl py-3.5 font-bold text-sm shadow-lg shadow-[#388bfd]/20 mb-4 transition-all active:scale-[0.98]">UPDATE SECURITY</button>
               <button onClick={() => setMode('profile')} className="text-[#8b949e] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Abourt & Return</button>
             </>
           )}

           {mode === 'delete' && (
             <>
               <h2 className="text-2xl font-bold text-[#f85149] mb-4 text-center tracking-tight">TERMINATE ACCOUNT</h2>
               <p className="text-sm text-[#8b949e] mb-8 text-center leading-relaxed px-2">
                  Warning: Self-destruct sequence will permanently erase all metadata associated with this identity.
               </p>
               <div className="w-full space-y-4 mb-8">
                  <PasswordInput placeholder="Confirm Identity with Password" value={deleteForm.password} onChange={(e: any) => setDeleteForm({...deleteForm, password: e.target.value})} />
               </div>
               
               <button onClick={handleDeleteAccount} className="bg-[#f85149] text-white w-full rounded-xl py-3.5 font-bold text-sm shadow-lg shadow-[#f85149]/20 mb-4 transition-all active:scale-[0.98]">CONFIRM TERMINATION</button>
               <button onClick={() => setMode('profile')} className="text-[#8b949e] text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">Abort & Return</button>
             </>
           )}
        </div>
      </div>
    </div>
  );
}

