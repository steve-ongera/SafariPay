"""
core/management/commands/see_data.py

Seeds ~1 year of realistic data for the SpendPal fintech app.

Usage:
    python manage.py see_data               # seed with defaults
    python manage.py see_data --users 30    # custom user count
    python manage.py see_data --flush       # wipe + re-seed
"""

import random
from decimal import Decimal
from datetime import timedelta, date

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import (
    User, Wallet, Transaction, MicroLoan, SavingsGoal, ExchangeRate,
    Currency, AccountTier, LoanStatus, TransactionType, TransactionStatus,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def rnd_date_in_range(start: date, end: date):
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def rnd_dt_in_range(start, end):
    delta = (end - start).total_seconds()
    return start + timedelta(seconds=random.randint(0, int(delta)))


def make_aware_from_date(d: date):
    dt = timezone.datetime(d.year, d.month, d.day,
                           random.randint(6, 22), random.randint(0, 59))
    return timezone.make_aware(dt)


# ── Seed constants ────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Amina", "Brian", "Cynthia", "David", "Esther", "Felix", "Grace",
    "Hassan", "Irene", "James", "Kezia", "Lawrence", "Mary", "Njoroge",
    "Olivia", "Patrick", "Queenie", "Robert", "Sarah", "Thomas",
    "Uchenna", "Violet", "Walter", "Xenia", "Yusuf", "Zipporah",
    "Abiodun", "Beatrice", "Caleb", "Diana",
]

LAST_NAMES = [
    "Kamau", "Ochieng", "Wanjiku", "Mwangi", "Akinyi", "Otieno",
    "Njeri", "Mutua", "Waweru", "Odhiambo", "Gitau", "Ndungu",
    "Kariuki", "Adhiambo", "Kimani", "Auma", "Mugo", "Onyango",
    "Njenga", "Okello", "Ibrahim", "Adeyemi", "Mensah", "Diallo",
    "Nwosu", "Asante", "Banda", "Chirwa", "Dlamini", "Eze",
]

SAVINGS_GOALS = [
    ("🏠", "House Deposit"),
    ("✈️", "Holiday to Dubai"),
    ("📱", "iPhone Upgrade"),
    ("🎓", "School Fees"),
    ("🚗", "Car Purchase"),
    ("💍", "Wedding Fund"),
    ("🏥", "Emergency Fund"),
    ("💻", "Laptop Fund"),
    ("🌍", "Travel Africa"),
    ("🎉", "Birthday Party"),
    ("🏋️", "Gym Equipment"),
    ("📚", "Online Course"),
]

LOAN_PURPOSES = [
    "Business stock purchase",
    "Medical emergency",
    "School fees top-up",
    "Utility bill payment",
    "Rent advance",
    "Equipment repair",
    "Agriculture inputs",
    "Transport costs",
]

SEND_LABELS = [
    "Sent to family", "Rent payment", "Grocery shopping",
    "Airtime top-up", "Utility bill", "Business expense",
    "Salary advance", "SACCO contribution",
]

EXCHANGE_RATES = {
    # (from, to): rate
    ("KES", "USD"): Decimal("0.007752"),
    ("KES", "EUR"): Decimal("0.007143"),
    ("KES", "GBP"): Decimal("0.006098"),
    ("KES", "UGX"): Decimal("28.57"),
    ("KES", "TZS"): Decimal("17.86"),
    ("KES", "NGN"): Decimal("12.35"),
    ("KES", "GHS"): Decimal("0.1012"),
    ("USD", "KES"): Decimal("129.00"),
    ("EUR", "KES"): Decimal("139.97"),
    ("GBP", "KES"): Decimal("163.94"),
    ("UGX", "KES"): Decimal("0.035"),
    ("TZS", "KES"): Decimal("0.056"),
    ("NGN", "KES"): Decimal("0.081"),
    ("GHS", "KES"): Decimal("9.88"),
}


class Command(BaseCommand):
    help = "Seed one year of realistic fintech data."

    def add_arguments(self, parser):
        parser.add_argument("--users",  type=int, default=20,
                            help="Number of regular users to create (default 20)")
        parser.add_argument("--flush",  action="store_true",
                            help="Delete all existing app data before seeding")

    # ── Entry point ───────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        n_users = options["users"]

        now   = timezone.now()
        start = now - timedelta(days=365)

        with transaction.atomic():
            self._seed_exchange_rates()
            users   = self._seed_users(n_users, start, now)
            wallets = self._seed_wallets(users, start)
            self._seed_transactions(wallets, start, now)
            self._seed_loans(users, wallets, start, now)
            self._seed_savings_goals(users, wallets, start, now)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅  Seeded {n_users} users | 365 days of activity\n"
        ))

    # ── Flush ─────────────────────────────────────────────────────────────────

    def _flush(self):
        self.stdout.write("🗑  Flushing existing data …")
        SavingsGoal.objects.all().delete()
        MicroLoan.objects.all().delete()
        Transaction.objects.all().delete()
        Wallet.objects.all().delete()
        User.objects.filter(is_staff=False).delete()
        ExchangeRate.objects.all().delete()
        self.stdout.write("   Done.\n")

    # ── Exchange Rates ────────────────────────────────────────────────────────

    def _seed_exchange_rates(self):
        self.stdout.write("💱  Seeding exchange rates …")
        for (frm, to), rate in EXCHANGE_RATES.items():
            micro = int(rate * 1_000_000)
            ExchangeRate.objects.update_or_create(
                from_currency=frm,
                to_currency=to,
                defaults={"_rate_micro": micro},
            )
        self.stdout.write(f"   {len(EXCHANGE_RATES)} rates created/updated.")

    # ── Users ─────────────────────────────────────────────────────────────────

    def _seed_users(self, n, start, now):
        self.stdout.write(f"👤  Creating {n} users …")
        users = []

        # Always create a demo superuser
        if not User.objects.filter(email="admin@spendpal.app").exists():
            admin = User.objects.create_superuser(
                email="admin@spendpal.app",
                password="Admin1234!",
                first_name="Admin",
                last_name="SpendPal",
            )
            users.append(admin)
            self.stdout.write("   Superuser: admin@spendpal.app / Admin1234!")

        # Demo regular user (easy to log in as)
        if not User.objects.filter(email="demo@spendpal.app").exists():
            demo = User.objects.create_user(
                email="demo@spendpal.app",
                password="Demo1234!",
                first_name="Demo",
                last_name="User",
                tier=AccountTier.STANDARD,
                kyc_level=2,
                _credit_score=620,
                _risk_band=2,
            )
            demo.set_transaction_pin("1234")
            demo.save()
            users.append(demo)
            self.stdout.write("   Demo user:  demo@spendpal.app / Demo1234!  PIN: 1234")

        for i in range(n):
            first = random.choice(FIRST_NAMES)
            last  = random.choice(LAST_NAMES)
            email = f"{first.lower()}.{last.lower()}{i}@example.com"

            if User.objects.filter(email=email).exists():
                users.append(User.objects.get(email=email))
                continue

            joined_at = rnd_dt_in_range(start, now)
            tier      = random.choices(
                [AccountTier.BASIC, AccountTier.STANDARD, AccountTier.PREMIUM, AccountTier.BUSINESS],
                weights=[50, 30, 15, 5],
            )[0]
            kyc = {"BASIC": 1, "STANDARD": 2, "PREMIUM": 3, "BUSINESS": 3}[tier]
            score = random.randint(300, 850)
            band  = 1 if score >= 650 else (2 if score >= 450 else 3)

            u = User(
                email=email,
                first_name=first,
                last_name=last,
                display_name=f"{first} {last}",
                phone=f"+2547{random.randint(10000000, 99999999)}",
                tier=tier,
                kyc_level=kyc,
                _credit_score=score,
                _risk_band=band,
                date_joined=joined_at,
            )
            u.set_password("Password1!")
            u.set_transaction_pin(str(random.randint(1000, 9999)))
            u.save()
            users.append(u)

        self.stdout.write(f"   {len(users)} users ready.")
        return users

    # ── Wallets ───────────────────────────────────────────────────────────────

    def _seed_wallets(self, users, start):
        self.stdout.write("💳  Creating wallets …")
        wallets = []

        currency_weights = {
            Currency.KES: 70,
            Currency.UGX: 8,
            Currency.TZS: 7,
            Currency.NGN: 6,
            Currency.GHS: 4,
            Currency.USD: 3,
            Currency.EUR: 1,
            Currency.GBP: 1,
        }
        currencies = list(currency_weights.keys())
        weights    = list(currency_weights.values())

        for u in users:
            # Primary KES wallet for everyone
            primary_balance = Decimal(str(random.uniform(500, 150_000)))
            w, _ = Wallet.objects.get_or_create(
                owner=u,
                currency=Currency.KES,
                defaults={
                    "is_primary":     True,
                    "_balance_micro": int(primary_balance * 1_000_000),
                },
            )
            wallets.append(w)

            # Some users have a second wallet
            if random.random() < 0.35:
                extra_currency = random.choices(
                    [c for c in currencies if c != Currency.KES], k=1
                )[0]
                extra_bal = Decimal(str(random.uniform(10, 5_000)))
                w2, _ = Wallet.objects.get_or_create(
                    owner=u,
                    currency=extra_currency,
                    defaults={"_balance_micro": int(extra_bal * 1_000_000)},
                )
                wallets.append(w2)

        self.stdout.write(f"   {len(wallets)} wallets ready.")
        return wallets

    # ── Transactions ──────────────────────────────────────────────────────────

    def _seed_transactions(self, wallets, start, now):
        self.stdout.write("🔄  Generating transactions …")
        total = 0

        for wallet in wallets:
            # Each wallet gets 12–120 transactions spread across the year
            n_txns = random.randint(12, 120)
            bulk   = []

            for _ in range(n_txns):
                txn_type, amount, label = self._random_txn_details(wallet.currency)
                fee_pct = Decimal("0.015") if txn_type == TransactionType.SEND else Decimal("0")
                fee     = (amount * fee_pct).quantize(Decimal("0.01"))
                status  = random.choices(
                    [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.REVERSED],
                    weights=[88, 8, 4],
                )[0]

                created = rnd_dt_in_range(start, now)
                completed = (
                    created + timedelta(seconds=random.randint(1, 120))
                    if status == TransactionStatus.COMPLETED else None
                )

                txn = Transaction(
                    wallet=wallet,
                    txn_type=txn_type,
                    status=status,
                    _amount_micro=int(amount * 1_000_000),
                    _fee_micro=int(fee * 1_000_000),
                    currency=wallet.currency,
                    counterparty_label=label,
                    description=random.choice(SEND_LABELS) if txn_type == TransactionType.SEND else "",
                    created_at=created,
                    completed_at=completed,
                )
                bulk.append(txn)

            Transaction.objects.bulk_create(bulk, ignore_conflicts=True)
            total += len(bulk)

        self.stdout.write(f"   {total} transactions created.")

    def _random_txn_details(self, currency):
        txn_type = random.choices(
            [
                TransactionType.SEND,
                TransactionType.RECEIVE,
                TransactionType.DEPOSIT,
                TransactionType.WITHDRAW,
                TransactionType.SAVINGS_IN,
                TransactionType.SAVINGS_OUT,
                TransactionType.FEE,
            ],
            weights=[30, 25, 15, 12, 8, 5, 5],
        )[0]

        # Realistic amount ranges by type (KES scale)
        ranges = {
            TransactionType.SEND:        (100,   50_000),
            TransactionType.RECEIVE:     (100,   80_000),
            TransactionType.DEPOSIT:     (500,  200_000),
            TransactionType.WITHDRAW:    (200,   50_000),
            TransactionType.SAVINGS_IN:  (100,   20_000),
            TransactionType.SAVINGS_OUT: (100,   10_000),
            TransactionType.FEE:         (5,        500),
        }
        lo, hi = ranges[txn_type]
        amount = Decimal(str(round(random.uniform(lo, hi), 2)))

        label  = random.choice(FIRST_NAMES) + " " + random.choice(LAST_NAMES)
        return txn_type, amount, label

    # ── Loans ─────────────────────────────────────────────────────────────────

    def _seed_loans(self, users, wallets, start, now):
        self.stdout.write("🏦  Generating micro-loans …")
        wallet_map = {w.owner_id: w for w in wallets if w.is_primary}
        total      = 0

        # 40% of users get at least one loan
        borrowers = random.sample(users, k=max(1, int(len(users) * 0.4)))

        for user in borrowers:
            wallet = wallet_map.get(user.pk)
            if not wallet:
                continue

            n_loans = random.randint(1, 4)
            for _ in range(n_loans):
                principal = Decimal(str(random.choice([
                    500, 1_000, 2_000, 3_000, 5_000,
                    7_500, 10_000, 15_000, 20_000, 30_000,
                ])))
                duration  = random.choice([7, 14, 21, 30, 60, 90])
                bps       = random.choice([200, 250, 300, 350, 500])  # 2–5 %

                created_at  = rnd_dt_in_range(start, now)
                status      = random.choices(
                    [LoanStatus.PENDING, LoanStatus.APPROVED, LoanStatus.ACTIVE,
                     LoanStatus.REPAID, LoanStatus.DEFAULTED, LoanStatus.REJECTED],
                    weights=[5, 5, 25, 45, 10, 10],
                )[0]

                approved_at = repaid_at = due_date = None
                outstanding = principal

                if status in (LoanStatus.APPROVED, LoanStatus.ACTIVE,
                               LoanStatus.REPAID, LoanStatus.DEFAULTED):
                    approved_at = created_at + timedelta(hours=random.randint(1, 48))
                    due_date    = (approved_at + timedelta(days=duration)).date()

                if status == LoanStatus.REPAID:
                    repaid_at   = make_aware_from_date(
                        rnd_date_in_range(approved_at.date(), min(due_date, now.date()))
                    )
                    outstanding = Decimal("0")

                if status == LoanStatus.DEFAULTED:
                    # partially repaid
                    paid_frac   = Decimal(str(round(random.uniform(0, 0.8), 2)))
                    outstanding = (principal * (1 - paid_frac)).quantize(Decimal("0.01"))

                MicroLoan.objects.create(
                    borrower=user,
                    wallet=wallet,
                    _principal_micro=int(principal * 1_000_000),
                    _outstanding_micro=int(outstanding * 1_000_000),
                    currency=wallet.currency,
                    interest_bps=bps,
                    duration_days=duration,
                    status=status,
                    _score_snapshot=user._credit_score,
                    due_date=due_date,
                    created_at=created_at,
                    approved_at=approved_at,
                    repaid_at=repaid_at,
                )
                total += 1

        self.stdout.write(f"   {total} loans created.")

    # ── Savings Goals ─────────────────────────────────────────────────────────

    def _seed_savings_goals(self, users, wallets, start, now):
        self.stdout.write("🎯  Generating savings goals …")
        wallet_map = {w.owner_id: w for w in wallets if w.is_primary}
        total      = 0

        # 60% of users have savings goals
        savers = random.sample(users, k=max(1, int(len(users) * 0.6)))

        for user in savers:
            wallet = wallet_map.get(user.pk)
            if not wallet:
                continue

            n_goals = random.randint(1, 3)
            used_goals = random.sample(SAVINGS_GOALS, k=min(n_goals, len(SAVINGS_GOALS)))

            for emoji, name in used_goals:
                target  = Decimal(str(random.choice([
                    5_000, 10_000, 20_000, 30_000, 50_000,
                    75_000, 100_000, 150_000, 200_000, 500_000,
                ])))
                progress = random.uniform(0, 1.05)  # allow slightly over-target
                current  = min(target, (target * Decimal(str(round(progress, 2)))).quantize(Decimal("0.01")))

                created_at  = rnd_dt_in_range(start, now)
                target_date = (created_at + timedelta(days=random.randint(30, 365))).date()

                achieved_at = None
                if current >= target:
                    achieved_at = rnd_dt_in_range(created_at, now)

                auto_save = random.random() < 0.5
                freq      = random.choice(["D", "W", "M"])
                auto_amt  = (target / random.randint(10, 60)).quantize(Decimal("0.01")) if auto_save else Decimal("0")
                locked    = random.random() < 0.25

                SavingsGoal.objects.create(
                    owner=user,
                    wallet=wallet,
                    name=name,
                    emoji=emoji,
                    _target_micro=int(target * 1_000_000),
                    _current_micro=int(current * 1_000_000),
                    currency=wallet.currency,
                    auto_save=auto_save,
                    frequency=freq,
                    _auto_amount_micro=int(auto_amt * 1_000_000),
                    is_locked=locked,
                    target_date=target_date,
                    achieved_at=achieved_at,
                    created_at=created_at,
                )
                total += 1

        self.stdout.write(f"   {total} savings goals created.")