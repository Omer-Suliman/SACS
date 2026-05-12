# SACS — Student Affairs Coordination System

A full-stack web application that unifies academic advising, campus activities, student clubs, and a gamified rewards economy into a single platform with server-side Role-Based Access Control.

---

## Overview

SACS replaces fragmented, paper-based student-affairs workflows with a single persistent identity model. Five actor types interact through one Express application that simultaneously serves the static frontend and exposes a REST API under the `/api` prefix.

| Role | Capabilities |
|------|-------------|
| **Student** | Book advising slots, register for activities, join clubs, earn & redeem CampusCoins |
| **Doctor** | Manage advising availability, view booked appointments |
| **Staff** | Create and manage campus activities, validate attendance |
| **Admin** | Full system control — approve clubs, manage users, oversee all modules |
| **Partner** | List reward offerings, process on-campus voucher redemptions |

---

## Features

### Advising Slot Booking
- Students browse available advisor time slots and book on-campus meetings
- Atomic capacity enforcement via a single `findByIdAndUpdate` call (eliminates double-booking race conditions)
- `$addToSet` prevents a student from appearing twice in the same slot

### Campus Activity Management
- Staff create activities with registration caps
- Three-phase attendance pipeline: **pre-registration check → same-day temporal validation → idempotent scan** (powered by `$addToSet`)
- CampusCoins minted only after all three phases pass server-side

### Club Lifecycle Administration
- Persistent membership rosters stored in MongoDB (survives leadership transitions)
- Pending → Approved → Rejected approval workflow for new club applications
- Club posts and event announcements with an audit trail

### CampusCoin Rewards Economy
- Immutable `PointEvent` ledger — every earn and spend is recorded, never mutated
- Atomic reward redemption: stock decrement and balance deduction in one `$inc` write
- Unique vouchers generated per redemption, scannable by partner staff

---

## Tech Stack

**Frontend**
- Vanilla JavaScript (ES6 modules)
- Tailwind CSS v3
- Feather Icons
- Custom Web Components (`<custom-navbar>`, `<custom-footer>`)

**Backend**
- Node.js / Express 5
- MongoDB Atlas via Mongoose ODM
- bcryptjs (10 salt rounds) for password hashing
- CORS, dotenv

**Architecture**
- Single Express app serves both static frontend and REST API
- 11 route modules · 11 Mongoose schemas · ~4,240 lines of source code
- All RBAC enforced at route-handler level (zero client-side trust)

---

## Project Structure

```
sacs/
├── index.html               # Entry point (SPA shell)
├── style.css                # Global styles
├── tailwind.config.js
├── css/
│   ├── input.css
│   └── output.css           # Compiled Tailwind output
├── js/                      # Frontend modules
│   ├── app.js               # Router / auth guard
│   ├── db.js                # API abstraction layer (all fetch calls)
│   ├── activities.js
│   ├── admin.js
│   ├── appointments.js
│   ├── clubs.js
│   ├── rewards.js
│   └── auth.js
├── components/              # Web Components
│   ├── navbar.js
│   └── footer.js
├── screenshots/             # UI screenshots
└── anti-sacs-backend/       # Express + MongoDB backend
    ├── server.js
    ├── package.json
    ├── models/              # Mongoose schemas
    │   ├── User.js
    │   ├── Activity.js
    │   ├── Club.js
    │   ├── ClubEvent.js
    │   ├── ClubPost.js
    │   ├── Slot.js
    │   ├── Reward.js
    │   ├── Partner.js
    │   ├── PointEvent.js
    │   ├── PartnerRedemption.js
    │   └── Voucher.js
    └── routes/              # REST route handlers
        ├── userRoutes.js
        ├── activityRoutes.js
        ├── slotRoutes.js
        ├── clubRoutes.js
        ├── clubEventRoutes.js
        ├── clubPostRoutes.js
        ├── rewardRoutes.js
        ├── partnerRoutes.js
        ├── voucherRoutes.js
        ├── partnerRedemptionRoutes.js
        └── walletRoutes.js
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (free M0 tier works)

### 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/sacs.git
cd sacs
```

### 2 — Install backend dependencies

```bash
cd anti-sacs-backend
npm install
```

### 3 — Configure environment variables

Create a `.env` file inside `anti-sacs-backend/`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/sacs?retryWrites=true&w=majority
PORT=5000
```

### 4 — Run the server

```bash
node server.js
```

The app is now available at **http://localhost:5000**

### 5 — (Optional) Rebuild Tailwind CSS

```bash
# from the project root
npx tailwindcss -i ./css/input.css -o ./css/output.css --watch
```

---

## Screenshots

<table>
  <tr>
    <td><img src="screenshots/Screenshot 2026-05-01 160947.png" width="400"/></td>
    <td><img src="screenshots/Screenshot 2026-05-01 161004.png" width="400"/></td>
  </tr>
  <tr>
    <td><img src="screenshots/Screenshot 2026-05-01 161019.png" width="400"/></td>
    <td><img src="screenshots/Screenshot 2026-05-01 161032.png" width="400"/></td>
  </tr>
  <tr>
    <td><img src="screenshots/Screenshot 2026-05-01 161046.png" width="400"/></td>
    <td><img src="screenshots/Screenshot 2026-05-01 161113.png" width="400"/></td>
  </tr>
  <tr>
    <td><img src="screenshots/Screenshot 2026-05-01 161140.png" width="400"/></td>
    <td><img src="screenshots/Screenshot 2026-05-01 161237.png" width="400"/></td>
  </tr>
</table>

---

## API Endpoints (Summary)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Authenticate and receive session token |
| GET | `/api/activities` | List all campus activities |
| POST | `/api/activities/:id/register` | Register for an activity |
| POST | `/api/activities/:id/attend` | Record attendance (3-phase pipeline) |
| GET | `/api/slots` | List available advising slots |
| POST | `/api/slots/:id/book` | Book an advising slot |
| GET/POST | `/api/clubs` | List clubs / create new club |
| POST | `/api/clubs/:id/join` | Join a club |
| GET | `/api/rewards` | Browse reward catalogue |
| POST | `/api/rewards/:id/redeem` | Redeem reward (atomic) |
| GET | `/api/wallet` | Get CampusCoin balance and transaction history |

---

## Design Decisions

**Why `$addToSet` instead of application-layer duplicate checks?**
MongoDB's `$addToSet` is atomic at the document level. An application-layer read-then-write creates a window where two concurrent requests can both pass the check and both insert — leading to double bookings or double point awards. `$addToSet` eliminates that window entirely.

**Why an immutable `PointEvent` collection instead of a running balance field?**
A running balance can be corrupted by bugs or direct DB writes. An append-only ledger means the balance is always derivable from source-of-truth records, and every earn/spend is auditable.

**Why bcryptjs instead of client-side hashing?**
Client-side SHA-256 hashes are just a second password — they can be replayed directly against the API. Server-side bcrypt with 10 salt rounds makes each hash unique and computationally expensive to brute-force.

---

## License

MIT
