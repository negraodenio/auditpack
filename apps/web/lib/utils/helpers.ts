// =====================================================
// AuditPack Utilities & Helpers
// =====================================================

import CryptoJS from 'crypto-js';

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-min-32-chars!';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  
  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    authTag: '', // CBC não usa authTag
  };
}

export function decrypt(data: EncryptedData): string {
  const iv = CryptoJS.enc.Base64.parse(data.iv);
  const ciphertext = CryptoJS.enc.Base64.parse(data.ciphertext);
  
  const decrypted = CryptoJS.AES.decrypt(
    ciphertext.toString(),
    ENCRYPTION_KEY,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function hash(value: string): string {
  return CryptoJS.SHA256(value).toString();
}

// Formatting helpers
export function formatCurrency(amount: number | null, currency: string = 'EUR'): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatNIF(nif: string | null): string {
  if (!nif) return '-';
  // Format: 123 456 789
  return nif.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

// Validation helpers
export function isValidNIF(nif: string): boolean {
  // Portuguese NIF validation
  if (!nif || nif.length !== 9) return false;
  if (!/^\d{9}$/.test(nif)) return false;
  
  const digits = nif.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0);
  const remainder = sum % 11;
  const calculatedCheck = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  
  return checkDigit === calculatedCheck;
}

// Color helpers for UI
export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'critical':
      return 'bg-danger-100 text-danger-800 border-danger-200';
    case 'high':
      return 'bg-danger-50 text-danger-700 border-danger-200';
    case 'medium':
      return 'bg-warning-100 text-warning-800 border-warning-200';
    case 'low':
      return 'bg-success-100 text-success-800 border-success-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-danger-600 bg-danger-50';
    case 'warning':
      return 'text-warning-600 bg-warning-50';
    case 'info':
      return 'text-primary-600 bg-primary-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
    default:
      return '⚪';
  }
}

export function getComplianceColor(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 90) return 'text-success-600';
  if (score >= 70) return 'text-warning-600';
  return 'text-danger-600';
}

// Truncate helpers
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// Debounce helper
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
