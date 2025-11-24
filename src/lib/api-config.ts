export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  // Auth
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  
  // Content (User-specific)
  CONTENT_ME: `${API_BASE_URL}/content/me`,
  CONTENT_USERNAME: (username: string) => `${API_BASE_URL}/content/${username}`,
  
  // Profile
  PROFILE: `${API_BASE_URL}/profile`,
  EDUCATION: `${API_BASE_URL}/profile/education`,
  EXPERIENCE: `${API_BASE_URL}/profile/experience`,
  SKILLS: `${API_BASE_URL}/profile/skills`,
  PORTFOLIO: `${API_BASE_URL}/profile/portfolio`,
  
  // Contact
  CONTACT: `${API_BASE_URL}/contact`,
  
  // Layout & Widgets
  LAYOUT: `${API_BASE_URL}/layout`,
  WIDGETS: `${API_BASE_URL}/widgets`,
  
  // Theme Config
  THEME_DEFAULT: `${API_BASE_URL}/theme-config`,
  THEME_CONFIG: (username: string) => `${API_BASE_URL}/theme-config/${username}`,
  THEME_ME: `${API_BASE_URL}/theme/me`,
  THEME_UPDATE: `${API_BASE_URL}/theme`,
  THEME_USERNAME: (username: string) => `${API_BASE_URL}/theme/${username}`,
  
  // Settings
  SETTINGS: `${API_BASE_URL}/settings`,
  
  // Upload
  UPLOAD: `${API_BASE_URL}/upload`,
  UPLOAD_PROFILE: `${API_BASE_URL}/upload/profile`,
  UPLOAD_PORTFOLIO: `${API_BASE_URL}/upload/portfolio`,
  UPLOAD_WIDGET: `${API_BASE_URL}/upload/widget`,
  
  // Edit History
  EDIT_HISTORY: `${API_BASE_URL}/admin/edit-history`,
};

// Helper function to get JWT token from localStorage
// รองรับทั้ง authToken และ adminToken (adminToken มีความสำคัญกว่า)
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    // ตรวจสอบ adminToken ก่อน (สำหรับ admin pages)
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      return adminToken;
    }
    // ถ้าไม่มี adminToken ให้ใช้ authToken (สำหรับ public pages)
    return localStorage.getItem('authToken');
  }
  return null;
}

// Helper function to check if error is a connection error
export function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  // Check for TypeError with "Failed to fetch" message
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  
  // Check error message for connection-related errors
  const errorMessage = error.message || String(error);
  const connectionErrorPatterns = [
    'ERR_CONNECTION_REFUSED',
    'Failed to fetch',
    'NetworkError',
    'Network request failed',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_NAME_NOT_RESOLVED',
  ];
  
  return connectionErrorPatterns.some(pattern => 
    errorMessage.includes(pattern)
  );
}

// Helper function for making API calls with credentials and JWT token
export async function apiRequest(url: string, options?: RequestInit) {
  const token = getAuthToken();
  const method = options?.method || 'GET';
  
  // Check if body is FormData - if so, don't set Content-Type (browser will set it with boundary)
  const isFormData = options?.body instanceof FormData;
  
  // Only set Content-Type for requests with body (POST, PUT, PATCH) and not FormData
  const needsContentType = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && !isFormData;
  
  const headers: HeadersInit = {
    ...(needsContentType && { 'Content-Type': 'application/json' }),
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const defaultOptions: RequestInit = {
    method,
    credentials: 'include',
    headers,
    ...options,
    // Preserve cache option if provided
    ...(options?.cache && { cache: options.cache }),
  };

  try {
    const response = await fetch(url, defaultOptions);
    return response;
  } catch (error) {
    // Enhanced error logging with connection error detection
    if (isConnectionError(error)) {
      // Enhanced error logging with more details
      const errorDetails = {
        message: 'Backend server may not be running or unreachable',
        url,
        method,
        apiBaseUrl: API_BASE_URL,
        suggestion: 'Please ensure the backend server is running on port 3001',
      };
      
      // Log detailed error in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ Connection error for ${url}:`, errorDetails);
        console.error(`💡 To start the backend server, run: cd backend && npm run start:dev`);
      } else {
        console.warn(`⚠️ Connection error: Backend server unreachable`);
      }
      
      // Enhance error object with helpful information
      const enhancedError = new Error(
        `ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (${url})`
      ) as any;
      enhancedError.originalError = error;
      enhancedError.isConnectionError = true;
      enhancedError.url = url;
      enhancedError.apiBaseUrl = API_BASE_URL;
      throw enhancedError;
    } else {
      console.error(`❌ API Request failed for ${url}:`, error);
    }
    throw error;
  }
}

