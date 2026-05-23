export interface BiometricLinkedUser {
  id: string;
  username: string;
  email: string;
  fullname?: string;
  avatarUrl?: string;
  credId?: string;
  hasFaceImage?: boolean;
  faceImage?: string;
}

export function getBiometricLinkedUsers(): BiometricLinkedUser[] {
  const listStr = localStorage.getItem('biometric_linked_users') || '[]';
  try {
    const list = JSON.parse(listStr);
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  } catch (err) {
    console.error("Failed to parse biometric_linked_users:", err);
    return [];
  }
}

export function addBiometricLinkedUser(user: any) {
  if (!user || !user.username) return;
  const list = getBiometricLinkedUsers();
  
  // Remove duplicate if it already exists (case-insensitive username check)
  const filtered = list.filter(u => u.username.toLowerCase() !== user.username.toLowerCase());
  
  const newUser: BiometricLinkedUser = {
    id: String(user.id || user.user_id || ''),
    username: user.username,
    email: user.email || '',
    fullname: user.fullname || '',
    avatarUrl: user.avatarUrl || '',
    credId: user.credId || '',
    hasFaceImage: !!user.faceImage || user.hasFaceImage || false,
    faceImage: user.faceImage || ''
  };
  
  filtered.push(newUser);
  localStorage.setItem('biometric_linked_users', JSON.stringify(filtered));
  
  // Keep the active biometric_linked_user in sync
  localStorage.setItem('biometric_linked_user', JSON.stringify(newUser));
}

export function removeBiometricLinkedUser(username: string) {
  if (!username) return;
  const list = getBiometricLinkedUsers();
  const filtered = list.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  localStorage.setItem('biometric_linked_users', JSON.stringify(filtered));
  
  // If we removed the active user, update active user storage too
  const storedActive = localStorage.getItem('biometric_linked_user');
  if (storedActive) {
    try {
      const activeObj = JSON.parse(storedActive);
      if (activeObj && activeObj.username.toLowerCase() === username.toLowerCase()) {
        localStorage.removeItem('biometric_linked_user');
        if (filtered.length > 0) {
          localStorage.setItem('biometric_linked_user', JSON.stringify(filtered[0]));
        }
      }
    } catch {
      localStorage.removeItem('biometric_linked_user');
    }
  }
}
