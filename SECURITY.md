# Security Policy for CivicOS

CivicOS is a critical municipal infrastructure platform that manages urban incident telemetry, dispatch workflows, and citizen verification. Security, integrity, and data protection are fundamental to our architecture.

---

## Supported Versions

Only the latest active release and supported LTS branches receive security updates.

| Version | Supported          | Release Status |
| ------- | ------------------ | -------------- |
| 1.0.x   | :white_check_mark: | Active         |
| < 1.0   | :x:                | Deprecated     |

---

## Reporting a Vulnerability

We welcome coordinated disclosure of potential security vulnerabilities. If you discover a vulnerability in CivicOS, please report it immediately:

1. **Email**: `security@civicos.org`
2. **Encrypted Submissions**: For sensitive vulnerability disclosures, please encrypt your communication using our PGP public key available at `https://civicos.org/.well-known/security.txt`.
3. **Information to Include**:
   - Severity assessment (CVSS score if available)
   - Step-by-step reproduction instructions or Proof of Concept (PoC)
   - Affected endpoints or components
   - Impact on confidential citizen data or municipal dispatch workflows

**Please do NOT open public GitHub issues for undisclosed security vulnerabilities.**

---

## Response & Remediation SLA

Our Security Operations and Response Team adheres to strict response timelines:

| Action | Target SLA |
| ------ | ---------- |
| Initial Acknowledgement | **< 24 Hours** |
| Triage & Severity Classification | **< 48 Hours** |
| Remediation Patch / Hotfix | **< 72 Hours** (Critical/High), **< 7 Days** (Medium) |
| Public Disclosure / CVE Assignment | Coordinated post-deployment of fix |

---

## Security Architecture & Controls Overview

CivicOS implements Defense-in-Depth across every layer:

1. **Authentication & Token Lifecycle**:
   - Short-lived Access Tokens (15 min) signed via HS256 (`jose`)
   - Rotated 7-day Refresh Tokens stored as cryptographic SHA-256 hashes in `Session` database table
   - Instant single-session and global revocation (`/api/auth/logout`, `/api/auth/logout-all`)
   - `httpOnly`, `Secure`, `SameSite=Strict` cookie protection

2. **Access Control & Zero IDOR**:
   - Centralized Edge-compatible `middleware.ts` enforcing route-level RBAC (`SUPER_ADMIN`, `AUTHORITY`, `MODERATOR`, `CITIZEN`)
   - Strict resource-level authorization checks in `src/lib/authorize.ts` prior to any database mutation
   - Enumeration defense (404 on unauthenticated or non-existent records, 403 on existing unauthorized records)

3. **Rate Limiting & Brute-Force Defense**:
   - Sliding-window rate limiting on all sensitive endpoints (`@upstash/ratelimit` with high-performance in-memory fallback)
   - Account lockout after 5 consecutive failed login attempts (15-minute freeze)
   - Timing-attack resistant constant-time password comparison (`bcryptjs`)

4. **Input Validation & Sanitization**:
   - Comprehensive `zod` schemas for all incoming HTTP bodies, URL parameters, and query strings
   - AI prompt-injection neutralization and delimiter bounding (`"""USER INPUT START"""`)
   - Max length capping on descriptions and queries (2,000 characters)

5. **Upload & Binary File Safety**:
   - Strict 5MB file size limit
   - Cryptographic magic byte signature verification (JPEG, PNG, WebP)
   - Storage outside web root with randomized UUID filenames
   - Isolated serving endpoint `/api/files/[id]` with `X-Content-Type-Options: nosniff` and `Content-Disposition: inline`

6. **Network & Transport Hardening**:
   - Content Security Policy (CSP) blocking unauthorized scripts and object injection
   - HTTP Strict Transport Security (HSTS) with 2-year `max-age` and preload
   - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
   - Origin and Referer validation on state-changing requests (CSRF defense)

7. **Tamper-Evident Audit Logging**:
   - Append-only `AuditLog` table capturing actor, action, timestamp, IP, User-Agent, and Request ID
   - Zero update or deletion operations permitted on audit logs
