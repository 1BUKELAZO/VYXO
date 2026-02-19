// backend/src/utils/validation.ts

// Validar email con regex
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validar password (mínimo 8 caracteres, al menos 1 letra y 1 número)
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

// Sanitizar string (prevenir XSS básico)
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validar longitud de texto
export function isValidLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}