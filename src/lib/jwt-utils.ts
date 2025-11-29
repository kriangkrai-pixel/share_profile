/**
 * JWT Utility Functions
 * ฟังก์ชันสำหรับจัดการ JWT token
 */

interface JWTPayload {
  sub: number; // user id
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Decode JWT token และดึงข้อมูล payload
 * @param token JWT token string
 * @returns JWTPayload หรือ null ถ้า decode ไม่ได้
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT token มี 3 ส่วน: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (ส่วนที่ 2)
    const payload = parts[1];
    
    // Base64 decode
    // JWT ใช้ base64url encoding ซึ่งต้อง replace - และ _ ก่อน decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * เก็บ token สำหรับ username นี้
 * @param username username ของ user
 * @param token JWT token
 */
export function setTokenForUser(username: string, token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const key = `authToken_${username}`;
  localStorage.setItem(key, token);
  // ไม่ต้องเขียนทับ authToken และ adminToken แบบ global เพราะจะทำให้ user อื่นโดน logout
  // เก็บเฉพาะ token แยกตาม username เท่านั้น
  
  // เก็บรายชื่อ users ที่ login ไว้
  const loggedInUsers = getLoggedInUsers();
  if (!loggedInUsers.includes(username)) {
    loggedInUsers.push(username);
    localStorage.setItem('loggedInUsers', JSON.stringify(loggedInUsers));
  }
  
  // เก็บเวลาที่ login สำหรับ user นี้
  localStorage.setItem(`adminLoginTime_${username}`, Date.now().toString());
}

/**
 * ดึง token สำหรับ username นี้
 * @param username username ของ user
 * @returns JWT token หรือ null
 */
export function getTokenForUser(username: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const key = `authToken_${username}`;
  return localStorage.getItem(key);
}

/**
 * ดึงรายชื่อ users ที่ login อยู่
 * @returns array ของ usernames
 */
export function getLoggedInUsers(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  const stored = localStorage.getItem('loggedInUsers');
  if (!stored) {
    return [];
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * ลบ token สำหรับ username นี้
 * @param username username ของ user
 */
export function removeTokenForUser(username: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const key = `authToken_${username}`;
  localStorage.removeItem(key);
  
  // อัปเดตรายชื่อ users
  const loggedInUsers = getLoggedInUsers().filter(u => u !== username);
  if (loggedInUsers.length === 0) {
    localStorage.removeItem('loggedInUsers');
    // ลบ authToken และ adminToken ถ้าไม่มี user login อยู่แล้ว
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminToken');
  } else {
    localStorage.setItem('loggedInUsers', JSON.stringify(loggedInUsers));
  }
}

/**
 * ดึง username จาก JWT token ใน localStorage
 * @param username optional username เพื่อดึง token ที่เฉพาะเจาะจง
 * @returns username string หรือ null ถ้าไม่มี token หรือ decode ไม่ได้
 */
export function getUsernameFromToken(username?: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let token: string | null = null;
  
  if (username) {
    // ถ้ามี username ให้ดึง token ที่เฉพาะเจาะจง
    token = getTokenForUser(username);
  } else {
    // ถ้าไม่มี username ให้ใช้ token เก่า (backward compatibility)
    token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  }
  
  if (!token) {
    return null;
  }

  const payload = decodeJWT(token);
  return payload?.username || null;
}

/**
 * ดึง user ID จาก JWT token ใน localStorage
 * @param username optional username เพื่อดึง token ที่เฉพาะเจาะจง
 * @returns user ID number หรือ null ถ้าไม่มี token หรือ decode ไม่ได้
 */
export function getUserIdFromToken(username?: string): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let token: string | null = null;
  
  if (username) {
    // ถ้ามี username ให้ดึง token ที่เฉพาะเจาะจง
    token = getTokenForUser(username);
  } else {
    // ถ้าไม่มี username ให้ใช้ token เก่า (backward compatibility)
    token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  }
  
  if (!token) {
    return null;
  }

  const payload = decodeJWT(token);
  return payload?.sub || null;
}

