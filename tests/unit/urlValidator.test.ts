import { describe, it, expect } from 'vitest';
import { isPrivateIp, isSsrfSafeHost, validateSafeJobUrl } from '@/lib/server/urlValidator';

describe('SSRF & URL Safety Validator Unit Tests', () => {
  describe('isPrivateIp', () => {
    it('1. correctly identifies IPv4 loopback (127.0.0.0/8)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.0.0.50')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('2. correctly identifies IPv4 private class A (10.0.0.0/8)', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.10.5')).toBe(true);
    });

    it('3. correctly identifies IPv4 private class B (172.16.0.0/12)', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('172.15.0.1')).toBe(false); // Public
      expect(isPrivateIp('172.32.0.1')).toBe(false); // Public
    });

    it('4. correctly identifies IPv4 private class C (192.168.0.0/16)', () => {
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('192.168.254.254')).toBe(true);
      expect(isPrivateIp('192.169.1.1')).toBe(false); // Public
    });

    it('5. correctly identifies IPv4 link-local & cloud metadata (169.254.0.0/16)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.1.1')).toBe(true);
    });

    it('6. correctly identifies IPv4 CGNAT (100.64.0.0/10) and 0.0.0.0', () => {
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
      expect(isPrivateIp('100.128.0.1')).toBe(false); // Public
      expect(isPrivateIp('0.0.0.0')).toBe(true);
    });

    it('7. correctly identifies IPv6 loopback, link-local, and ULA', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd12:3456:789a::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('8. correctly handles IPv4-mapped IPv6 addresses', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
    });

    it('9. allows legitimate public IPv4 addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('142.250.190.46')).toBe(false); // Google
      expect(isPrivateIp('104.244.42.1')).toBe(false);
    });
  });

  describe('isSsrfSafeHost', () => {
    it('10. rejects dangerous internal and cloud metadata hostnames', () => {
      expect(isSsrfSafeHost('localhost')).toBe(false);
      expect(isSsrfSafeHost('sub.localhost')).toBe(false);
      expect(isSsrfSafeHost('app.internal')).toBe(false);
      expect(isSsrfSafeHost('service.local')).toBe(false);
      expect(isSsrfSafeHost('metadata.google.internal')).toBe(false);
      expect(isSsrfSafeHost('metadata')).toBe(false);
      expect(isSsrfSafeHost('instance-data')).toBe(false);
      expect(isSsrfSafeHost('127.0.0.1')).toBe(false);
      expect(isSsrfSafeHost('169.254.169.254')).toBe(false);
    });

    it('11. accepts legitimate public hostnames', () => {
      expect(isSsrfSafeHost('boards.greenhouse.io')).toBe(true);
      expect(isSsrfSafeHost('jobs.lever.co')).toBe(true);
      expect(isSsrfSafeHost('anthropic.com')).toBe(true);
      expect(isSsrfSafeHost('scale.com')).toBe(true);
      expect(isSsrfSafeHost('google.com')).toBe(true);
    });
  });

  describe('validateSafeJobUrl', () => {
    it('12. rejects empty or malformed URLs', async () => {
      const emptyRes = await validateSafeJobUrl('');
      expect(emptyRes.isValid).toBe(false);
      expect(emptyRes.failureReason).toContain('Empty or invalid');

      const malformedRes = await validateSafeJobUrl('not-a-valid-url');
      expect(malformedRes.isValid).toBe(false);
      expect(malformedRes.failureReason).toContain('Malformed URL');
    });

    it('13. rejects non-HTTP/HTTPS protocols', async () => {
      const fileRes = await validateSafeJobUrl('file:///etc/passwd');
      expect(fileRes.isValid).toBe(false);
      expect(fileRes.failureReason).toContain('Disallowed protocol');

      const jsRes = await validateSafeJobUrl('javascript:alert(1)');
      expect(jsRes.isValid).toBe(false);
      expect(jsRes.failureReason).toContain('Disallowed protocol');
    });

    it('14. rejects localhost and private IP targets via SSRF filter', async () => {
      const localhostRes = await validateSafeJobUrl('http://localhost:3000/api/secret');
      expect(localhostRes.isValid).toBe(false);
      expect(localhostRes.failureReason).toContain('SSRF Violation');

      const privateIpRes = await validateSafeJobUrl('http://192.168.1.50/admin');
      expect(privateIpRes.isValid).toBe(false);
      expect(privateIpRes.failureReason).toContain('SSRF Violation');
    });
  });
});
