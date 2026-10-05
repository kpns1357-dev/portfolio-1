# CIVICOS — Municipal Problem Intelligence Platform

> **"Report problems. Track solutions. Understand your city."**

CivicOS is a full-stack, production-grade civic problem intelligence application. It transforms raw citizen observations into structured, prioritized municipal incidents, detects duplicates using spatial-temporal algorithms, routes tasks to municipal departments, verifies claimed resolutions using before/after evidence with AI confidence scoring, and empowers citizens to confirm or reject repairs.

---

## 🏛️ Core Seven-Stage Workflow

```
REAL-WORLD PROBLEM
        ↓
1. Citizen reports observation (Photos, GPS, Natural language)
        ↓
2. AI analyzes report (Hazard class, severity 0-10, safety risk, recommended department)
        ↓
3. Duplicates detected (Haversine geographic distance & token overlap)
        ↓
4. Observation becomes an INCIDENT (Deterministic Priority 0-100 & SLA deadline calculated)
        ↓
5. Moderator reviews & verifies (Approves, merges duplicates, flags abuse)
        ↓
6. Authority assigns operational field team (Workload-balanced dispatch)
        ↓
7. Inspection & Repair completed (Field crew uploads Before/After repair photos)
        ↓
8. AI-assisted resolution verification (Geometry comparison & confidence score)
        ↓
9. Citizen verification (YES, FIXED or NOT FIXED with reopening rationale)
        ↓
10. Incident resolved & historical analytics updated (Chronic hot-spot hypotheses detected)
```

---

## 🚀 Key Features

- **True Report vs Incident Architecture**: Multiple citizen observations (`REP-2026-XXXX`) correlate into a single real-world operational incident (`CF-2026-XXXXX`), boosting priority without duplicating field dispatches.
- **Deterministic Priority Scoring Engine**: Transparent 0–100 scoring based on Severity (+30), Safety Risk (+25), Multiple Reports (+12), Traffic Load (+8), Duration (+7), and Recurrence (+5), complete with a "Why High Priority?" breakdown.
- **Strict SLA Management**: Configurable service-level deadlines (Critical 24h, High 72h, Medium 168h, Low 336h) with live countdowns, warning pulses (<12h remaining), and automatic breach escalation records.
- **Visual Evidence & AI Verification**: Side-by-side Before/After comparison. Field teams must upload repair proof to claim resolution, and citizens hold the final authority to sign off or reject and reopen the case.
- **Interactive Leaflet/OpenStreetMap**: Custom colored priority markers, popover case cards, category/status filters, and analytical heatmap density mode.
- **Natural-Language Civic Telemetry Assistant**: AI assistant grounded directly in live database facts (answering queries like *"Which department has the highest workload?"* or *"What are the oldest critical cases?"* without hallucinations).
- **Incident Relational Provenance Graph**: Visual interactive network showing Location → Incident → Reports → Evidence → Department → Team → Verification.
- **Chronic Hot-Spot & Hypothesis Engine**: Spatial-temporal clustering detecting repeated failures in the same sectors (e.g. Sector 4 drainage-induced road collapse).
- **Offline PWA & IndexedDB**: Service worker caching and client-side IndexedDB persistence allow citizens to file reports offline, automatically synchronizing when network returns.
- **Role-Based Server-Side Security**: Enforced on all routes for Citizen, Moderator, Authority, and Super Admin.

---

## 👥 Demo User Credentials

CivicOS includes pre-seeded demo accounts with password `password123`:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicos.org` | `password123` | Submit reports, upload evidence, track cases, sign off or reject repairs |
| **Authority** | `authority@civicos.org` | `password123` | View work queue, dispatch teams, upload inspection/repair evidence |
| **Moderator** | `moderator@civicos.org` | `password123` | Review suspicious cases, merge duplicates, approve citizen reports |
| **Super Admin** | `admin@civicos.org` | `password123` | Configure SLA durations, calibrate priority weights, view audit logs |

*(A quick one-click Demo Role Switcher is also built into the top navigation bar).*

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (ES2020 target)
- **Styling**: Tailwind CSS
- **Database & ORM**: SQLite + Prisma ORM (natively portable, zero external daemon friction, foreign keys, cascades, composite indexes)
- **GIS Maps**: Leaflet + OpenStreetMap (CARTO tiles, custom SVG markers, heatmap circles)
- **Authentication**: JWT HTTP-only cookies + bcryptjs password hashing
- **Testing**: Vitest unit suite + Node.js E2E integration test suite

---

## 🧪 Testing & Verification

Run the test suites from the project root:

```bash
# Run unit test suite (12 tests)
npm test

# Run end-to-end integration scenario (11 steps verifying the full citizen-to-authority lifecycle)
node tests/e2e-workflow.js
```
