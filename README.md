# SafariPay 🌍

> **Next-generation microfinance & mobile banking platform for Africa**  
> Payments · Savings · AI Micro-Loans · Cross-Border · Developer APIs

---

## Project Structure

```
safaripay/
├── backend/                    # Django REST API
│   ├── apps/
│   │   └── wallet/
│   │       ├── models.py       # All data models (obfuscated IDs, micro-unit money)
│   │       ├── serializers.py  # Strict field control — internals never exposed
│   │       ├── views.py        # ViewSets + business logic
│   │       ├── urls.py         # App-level routes
│   │       ├── admin.py        # Admin panel registration
│   │       └── apps.py
│   ├── safaripay/
│   │   ├── settings.py         # Full production-ready config
│   │   └── urls.py             # Root URL conf
│   └── requirements.txt
│
└── frontend/                   # React + Vite SPA
    ├── index.html              # SEO, OG tags, Bootstrap Icons, Google Fonts
    └── src/
        ├── main.jsx            # React entry point
        ├── App.jsx             # Auth context, SPA router, sidebar
        ├── index.css           # Afro-futurist dark design system
        ├── services/
        │   └── api.js          # Pure fetch API client, JWT auto-refresh
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── WalletsPage.jsx
            ├── TransactionsPage.jsx
            ├── LoansPage.jsx
            ├── SavingsPage.jsx
            └── ProfilePage.jsx
```

---

## Backend Setup

### 1. Create virtual environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

Create a `.env` file (or export in shell):

```bash
export DJANGO_SECRET_KEY="your-50-char-random-secret-key-here"
export DEBUG="True"                           # False in production
export DB_NAME="safaripay"
export DB_USER="safaripay"
export DB_PASS="your_db_password"
export DB_HOST="localhost"
export DB_PORT="5432"
export REDIS_URL="redis://127.0.0.1:6379/0"
export CORS_ORIGINS="http://localhost:5173"
```

### 3. Create PostgreSQL database

```bash
psql -U postgres -c "CREATE USER safaripay WITH PASSWORD 'your_db_password';"
psql -U postgres -c "CREATE DATABASE safaripay OWNER safaripay;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE safaripay TO safaripay;"
```

### 4. Run migrations

```bash
python manage.py makemigrations wallet
python manage.py migrate
python manage.py createsuperuser
```

### 5. Start dev server

```bash
python manage.py runserver
```

API available at: `http://127.0.0.1:8000/api/v1/`  
Admin panel at:   `http://127.0.0.1:8000/admin/`

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App available at: `http://localhost:5173`

---

## API Reference

### Auth
| Method | Endpoint                    | Description            | Auth |
|--------|----------------------------|------------------------|------|
| POST   | `/api/v1/auth/register/`   | Create account         | No   |
| POST   | `/api/v1/auth/token/`      | Login → JWT tokens     | No   |
| POST   | `/api/v1/auth/token/refresh/` | Refresh access token| No   |
| POST   | `/api/v1/auth/token/logout/`  | Blacklist refresh   | Yes  |
| GET    | `/api/v1/auth/me/`         | Get profile            | Yes  |
| PATCH  | `/api/v1/auth/me/`         | Update profile         | Yes  |
| POST   | `/api/v1/auth/set-pin/`    | Set transaction PIN    | Yes  |

### Wallets
| Method | Endpoint                    | Description            |
|--------|----------------------------|------------------------|
| GET    | `/api/v1/wallets/`          | List all wallets        |
| POST   | `/api/v1/wallets/create/`   | Add currency wallet     |
| POST   | `/api/v1/wallets/send/`     | Send money (PIN req)    |
| POST   | `/api/v1/wallets/deposit/`  | Deposit via provider    |

### Transactions
| Method | Endpoint                      | Description             |
|--------|------------------------------|-------------------------|
| GET    | `/api/v1/transactions/`       | List (filter: ?type=)   |
| GET    | `/api/v1/transactions/{ref}/` | Get single transaction  |

### Loans
| Method | Endpoint               | Description              |
|--------|----------------------|--------------------------|
| GET    | `/api/v1/loans/`      | List all loans           |
| POST   | `/api/v1/loans/apply/`| Apply for micro-loan     |
| POST   | `/api/v1/loans/repay/`| Repay (PIN required)     |

### Savings
| Method | Endpoint                  | Description            |
|--------|--------------------------|------------------------|
| GET    | `/api/v1/savings/`        | List savings goals     |
| POST   | `/api/v1/savings/create/` | Create goal            |
| POST   | `/api/v1/savings/deposit/`| Deposit to goal (PIN)  |

---

## Security Architecture

### ID Obfuscation
| Entity      | External ID format        | Derivation                        |
|-------------|--------------------------|-----------------------------------|
| User        | `SP` + 24 hex chars       | BLAKE2b(16 random bytes)          |
| Wallet      | `WLT` + 18 hex chars      | `secrets.token_hex(9)`            |
| Transaction | `TXN` + 16 hex chars      | SHA-256(random bytes + timestamp) |
| Loan        | `LN` + 20 hex chars       | `secrets.token_hex(10)`           |
| Savings     | `SAV` + 18 hex chars      | `secrets.token_hex(9)`            |

**Internal UUID primary keys are never serialized to any API response.**

### Money Storage
All monetary values are stored as **integer micro-units** (1 currency unit = 1,000,000 micro-units).  
This completely eliminates floating-point rounding errors — critical for financial data.

### Transaction PIN
- Hashed with PBKDF2-SHA256, **260,000 iterations**
- Salt is the user's `public_id` (unique per user)
- Compared with `secrets.compare_digest` (timing-safe)
- Never stored in plain text, never transmitted in JWT

### JWT Claims
- `sub` / `user_id` claim uses `public_id` (opaque), **not** the internal UUID
- Credit scores, risk bands, and KYC flags are **server-side only**
- Tokens rotate on every refresh; blacklist enforced on logout

---

## Java Console Client

The included `JetCharterAuthClient.java` in the original spec works with this backend.  
Update `BASE_URL` to `http://127.0.0.1:8000/api/v1` and the login endpoint to `/auth/token/`.

---

## Production Deployment

1. Set `DEBUG=False`, generate a strong `DJANGO_SECRET_KEY`
2. Use PostgreSQL with SSL (`DB_SSL=require`)  
3. Run behind Nginx + Gunicorn: `gunicorn safaripay.wsgi:application`
4. Set all HSTS/security headers (auto-enabled when `DEBUG=False`)
5. Use Redis for caching and Celery for background tasks (FX rate refresh, auto-saves)
6. Build frontend: `npm run build` → serve `dist/` from Nginx

---

## Roadmap

- [ ] M-Pesa Daraja STK push integration
- [ ] Flutterwave / Paystack card deposits  
- [ ] Cross-border FX engine with live rates
- [ ] Celery tasks for auto-savings deduction
- [ ] ML credit scoring model (XGBoost)
- [ ] Developer API keys + rate limiting
- [ ] React Native mobile app
- [ ] USSD/SMS fallback via Africa's Talking