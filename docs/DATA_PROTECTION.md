# Data protection and cybersecurity alignment

This document maps the church management platform to proposed data protection and cybersecurity measures for digital transformation.

## 1. Strong password policies

| Measure | Status in platform |
|--------|---------------------|
| Uppercase, lowercase, numbers, special characters | **Enforced** on register, password reset, member change-password, and admin-set passwords (`backend/src/utils/passwordPolicy.js`) |
| Minimum length (8+) | **Enforced** (API + User model) |
| Hashed storage (not plain text) | **Implemented** — bcrypt (cost 12) on `User` passwords |
| Encourage regular changes | **Supported** — members use **My Account → Password**; admins can issue reset links |
| Do not share credentials | **UI hint** on password forms |

**Operational:** Use strong passwords for seeded superadmin in production; disable `PASSWORD_RESET_RETURN_TOKEN` in production (see `backend/.env.example`).

## 2. Data encryption and secure storage

| Measure | Status |
|--------|--------|
| Passwords encrypted/hashed | **Yes** — bcrypt |
| Data in transit | **HTTPS required in production** (TLS terminates at host / Cloudflare) |
| Database encryption at rest (AES) | **Hosting responsibility** — enable on MongoDB Atlas or provider-managed disk encryption |
| Application-level AES for all fields | **Not implemented** — rely on DB/host encryption + access control; field-level encryption can be added for highest-sensitivity fields if required |

## 3. Segregation of roles and responsibilities (RBAC)

| Role | Access |
|------|--------|
| **SUPERADMIN** | Platform-wide churches, users, finance (read-only where configured), settings |
| **ADMIN** | Own church: members, finance, payments, expenses, announcements, councils |
| **MEMBER** | Own profile, payments, announcements, councils (member portal) |
| **Conference leader** | Conference panel (separate route + middleware) |
| **Treasurer / secretary / deacon** | Expense approvals and targeted announcements via church leadership slots |

**Implemented:** JWT authentication, `requireRoles`, `requireMemberPortal`, church-scoped queries, treasurer access helpers.

## 4. Secure hosting infrastructure

| Measure | Status |
|--------|--------|
| Cloud hosting with monitoring | **Deployment choice** (not in repo) |
| Regular backups | **Configure** on MongoDB / server provider |
| Business continuity | **Document** RTO/RPO with hosting vendor |

## 5. Cloudflare security services

| Measure | Status |
|--------|--------|
| DDoS / WAF / CDN | **Recommended at deploy** — point DNS through Cloudflare; no code change required |
| Performance | **Benefit** from CDN caching static assets |

## 6. Data backup and recovery

| Measure | Status |
|--------|--------|
| Automated backups | **Configure** MongoDB Atlas backup or scheduled `mongodump` |
| Restore testing | **Operational procedure** — test quarterly |

## 7. User training and awareness

| Topic | Platform support |
|-------|-------------------|
| Safe passwords | Password policy + member password page |
| Phishing | **Training material** (external to app) |
| Responsible data use | Role-based UI limits exposure |
| System use | In-app labels and scoped dashboards per role |

## 8. Compliance and governance (Zimbabwe / best practice)

| Measure | Status |
|--------|--------|
| Privacy policy / consent | **Organizational** — publish on public site as needed |
| Access logging | **Partial** — server logs; audit trail module optional future work |
| Data minimization | **Practice** — collect member fields required for congregation records |
| Incident response | **Organizational** — define contacts and breach notification process |

## Security controls already in the codebase

- **Helmet** HTTP security headers (`backend/src/app.js`)
- **CORS** with credentials
- **JWT** session tokens with expiry (`JWT_EXPIRES_IN`)
- **Inactive user** blocking at login
- **Member approval** workflow for self-signup
- **Password reset** tokens hashed (SHA-256), 1-hour expiry
- **Superadmin finance** read-only guard where configured

## Recommended next steps (infrastructure / process)

1. Deploy API and frontend behind **HTTPS** and **Cloudflare**.
2. Enable **MongoDB encrypted storage** and **automated backups**.
3. Set production `JWT_SECRET` and disable dev-only reset token exposure.
4. Schedule **cybersecurity awareness** sessions for admins and treasurers.
5. Publish a **privacy notice** for members explaining what data is stored and why.
6. Optional: password **age policy** (force change every N days) and **audit log** for admin actions.

---

*Last updated to reflect strong password policy enforcement in application code.*
