export const API_URL = '/api/proxy/php/sync.php';
export const OPENROUTER_URL = '/api/proxy/openrouter';

const DEVICE_ID = 'web_' + Math.random().toString(36).substring(7);

async function fetchPhpApi(payload: any) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export const api = {
  login: (loginText: string, passwordText: string) => 
    fetchPhpApi({ action: 'login', login: loginText, password: passwordText, device_id: DEVICE_ID }),
    
  register: (fullname: string, username: string, email: string, passwordText: string) => 
    fetchPhpApi({ action: 'register', fullname, username, email, password: passwordText, device_id: DEVICE_ID }),
    
  getUserStatus: (userId: number, token: string) => 
    fetchPhpApi({ action: 'get_user_status', user_id: userId, token }),

  checkLimit: (userId: number, token: string) => 
    fetchPhpApi({ action: 'check_only', user_id: userId, token }),

  incrementMessageCount: (userId: number, token: string) => 
    fetchPhpApi({ action: 'increment_message_count', user_id: userId, token }),

  reportApiKeyUsage: (userId: number, token: string, keyId: number, success: boolean) =>
    fetchPhpApi({ action: 'report_api_key_usage', user_id: userId, token, key_id: keyId, success }),

  saveSessions: (userId: number, token: string, data: any[]) => 
    fetchPhpApi({ action: 'save_sessions', user_id: userId, token, device_id: DEVICE_ID, data }),

  loadSessions: (userId: number, token: string) => 
    fetchPhpApi({ action: 'load_sessions', user_id: userId, token }),

  deleteSession: (userId: number, token: string, sessionCreatedAt: number) =>
    fetchPhpApi({ action: 'delete_session', user_id: userId, token, session_created_at: sessionCreatedAt }),

  deleteAllSessions: (userId: number, token: string) =>
    fetchPhpApi({ action: 'delete_all_sessions', user_id: userId, token }),

  requestPasswordReset: (email: string) =>
    fetchPhpApi({ action: 'forgot_password', email }),

  confirmPasswordReset: (email: string, reset_token: string, new_password: string) =>
    fetchPhpApi({ action: 'reset_password', email, reset_token, new_password }),

  updateProfile: (userId: number, token: string, fullname: string, username: string, email: string) =>
    fetchPhpApi({ action: 'update_profile', user_id: userId, token, fullname, username, email }),

  changePassword: (userId: number, token: string, current_password: string, new_password: string) =>
    fetchPhpApi({ action: 'change_password', user_id: userId, token, current_password, new_password }),

  deleteAccount: (userId: number, token: string, passwordText: string) =>
    fetchPhpApi({ action: 'delete_account', user_id: userId, token, password: passwordText }),
    
  registerBiometrics: async (user: any, biometricKeyIndex: number, devicePin?: string, credId?: string, faceImage?: string) => {
    const res = await fetch("/api/biometrics/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, biometricKeyIndex, devicePin, credId, faceImage }),
    });
    return res.json();
  },

  checkBiometrics: async (login: string) => {
    const res = await fetch("/api/biometrics/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login }),
    });
    return res.json();
  },

  loginBiometrics: async (login: string, biometricKeyIndex: number, devicePin?: string, assertionId?: string, faceImage?: string, localScore?: number) => {
    const res = await fetch("/api/biometrics/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, biometricKeyIndex, devicePin, assertionId, faceImage, localScore }),
    });
    return res.json();
  },
    
  // Add more as needed
};

export async function customPhpApi(endpoint: string, payload?: any, method: string = 'POST') {
  const url = endpoint.replace(/^\/?api\//, '/api/proxy/php/');
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (payload && method !== 'GET') {
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(url, options);
  return response.json();
}

export async function checkBan(userId: number, token: string) {
  const url = '/api/proxy/php/check_ban.php';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, token })
  });
  return response.json();
}
