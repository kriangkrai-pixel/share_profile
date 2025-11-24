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
 * ดึง username จาก JWT token ใน localStorage
 * @returns username string หรือ null ถ้าไม่มี token หรือ decode ไม่ได้
 */
export function getUsernameFromToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (!token) {
    return null;
  }

  const payload = decodeJWT(token);
  return payload?.username || null;
}

/**
 * ดึง user ID จาก JWT token ใน localStorage
 * @returns user ID number หรือ null ถ้าไม่มี token หรือ decode ไม่ได้
 */
export function getUserIdFromToken(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (!token) {
    return null;
  }

  const payload = decodeJWT(token);
  return payload?.sub || null;
}

