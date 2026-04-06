import uuid
import secrets
import hashlib
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal


def _gen_uid():
    """Generate a cryptographically opaque, non-sequential public ID."""
    raw = secrets.token_bytes(16)
    digest = hashlib.blake2b(raw, digest_size=12).hexdigest()
    return f"SP{digest.upper()}"


def _gen_wallet_ref():
    """Non-guessable wallet reference: WLT + 18 hex chars."""
    return "WLT" + secrets.token_hex(9).upper()


def _gen_txn_ref():
    """Transaction ref: TXN + timestamp-masked hex."""
    seed = secrets.token_bytes(12) + timezone.now().isoformat().encode()
    return "TXN" + hashlib.sha256(seed).hexdigest()[:16].upper()


def _gen_loan_ref():
    return "LN" + secrets.token_hex(10).upper()


def _gen_savings_ref():
    return "SAV" + secrets.token_hex(9).upper()


# ── Currency choices ──────────────────────────────────────────────────────────
class Currency(models.TextChoices):
    KES = "KES", "Kenyan Shilling"
    UGX = "UGX", "Ugandan Shilling"
    TZS = "TZS", "Tanzanian Shilling"
    NGN = "NGN", "Nigerian Naira"
    GHS = "GHS", "Ghanaian Cedi"
    USD = "USD", "US Dollar"
    EUR = "EUR", "Euro"
    GBP = "GBP", "British Pound"


class AccountTier(models.TextChoices):
    BASIC    = "BASIC",    "Basic"
    STANDARD = "STANDARD", "Standard"
    PREMIUM  = "PREMIUM",  "Premium"
    BUSINESS = "BUSINESS", "Business"


class LoanStatus(models.TextChoices):
    PENDING   = "PENDING",   "Pending Review"
    APPROVED  = "APPROVED",  "Approved"
    ACTIVE    = "ACTIVE",    "Active"
    REPAID    = "REPAID",    "Fully Repaid"
    DEFAULTED = "DEFAULTED", "Defaulted"
    REJECTED  = "REJECTED",  "Rejected"


class TransactionType(models.TextChoices):
    SEND        = "SEND",        "Send Money"
    RECEIVE     = "RECEIVE",     "Receive Money"
    DEPOSIT     = "DEPOSIT",     "Deposit"
    WITHDRAW    = "WITHDRAW",    "Withdraw"
    LOAN_CREDIT = "LOAN_CREDIT", "Loan Disbursement"
    LOAN_DEBIT  = "LOAN_DEBIT",  "Loan Repayment"
    SAVINGS_IN  = "SAVINGS_IN",  "Savings Deposit"
    SAVINGS_OUT = "SAVINGS_OUT", "Savings Withdrawal"
    FEE         = "FEE",         "Service Fee"
    REVERSAL    = "REVERSAL",    "Transaction Reversal"


class TransactionStatus(models.TextChoices):
    PENDING   = "PENDING",   "Pending"
    COMPLETED = "COMPLETED", "Completed"
    FAILED    = "FAILED",    "Failed"
    REVERSED  = "REVERSED",  "Reversed"


# ── User Manager ──────────────────────────────────────────────────────────────
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        extra.setdefault("public_id", _gen_uid())
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


# ── User ──────────────────────────────────────────────────────────────────────
class User(AbstractBaseUser, PermissionsMixin):
    """
    Primary key is a UUID (never exposed in API).
    public_id (SP + 24 hex) is the only ID clients ever see.
    """
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    public_id = models.CharField(max_length=32, unique=True, default=_gen_uid, editable=False)

    email        = models.EmailField(unique=True)
    phone        = models.CharField(max_length=20, blank=True)
    first_name   = models.CharField(max_length=60)
    last_name    = models.CharField(max_length=60)
    display_name = models.CharField(max_length=80, blank=True)

    # Obfuscated KYC tier — stored as int, meaning only in code
    # 0=none, 1=basic, 2=standard, 3=full
    kyc_level    = models.PositiveSmallIntegerField(default=0)
    tier         = models.CharField(max_length=12, choices=AccountTier.choices, default=AccountTier.BASIC)

    pin_hash     = models.CharField(max_length=128, blank=True)  # 4-digit transaction PIN
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)

    date_joined  = models.DateTimeField(default=timezone.now)
    last_login   = models.DateTimeField(null=True, blank=True)

    # AI credit score — internal only, never serialized to client directly
    _credit_score = models.PositiveSmallIntegerField(default=300, db_column="c_scr")
    _risk_band    = models.PositiveSmallIntegerField(default=3, db_column="r_bnd")  # 1=low 2=med 3=high

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "sp_usr"

    def __str__(self):
        return f"{self.display_name or self.email} [{self.public_id}]"

    def set_transaction_pin(self, raw_pin: str):
        self.pin_hash = hashlib.pbkdf2_hmac(
            "sha256", raw_pin.encode(), self.public_id.encode(), 260_000
        ).hex()

    def check_transaction_pin(self, raw_pin: str) -> bool:
        expected = hashlib.pbkdf2_hmac(
            "sha256", raw_pin.encode(), self.public_id.encode(), 260_000
        ).hex()
        return secrets.compare_digest(self.pin_hash, expected)


# ── Wallet ────────────────────────────────────────────────────────────────────
class Wallet(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref        = models.CharField(max_length=24, unique=True, default=_gen_wallet_ref, editable=False)
    owner      = models.ForeignKey(User, on_delete=models.PROTECT, related_name="wallets")
    currency   = models.CharField(max_length=3, choices=Currency.choices, default=Currency.KES)

    # Balance stored as integer micro-units (1 KES = 1,000,000 units) — prevents float bugs
    # Divided by 1_000_000 when displaying
    _balance_micro = models.BigIntegerField(default=0, db_column="bal_mu")

    is_primary = models.BooleanField(default=False)
    is_frozen  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sp_wlt"
        unique_together = [("owner", "currency")]

    @property
    def balance(self) -> Decimal:
        return Decimal(self._balance_micro) / Decimal("1000000")

    def credit(self, amount: Decimal):
        self._balance_micro += int(amount * 1_000_000)

    def debit(self, amount: Decimal):
        micro = int(amount * 1_000_000)
        if self._balance_micro < micro:
            raise ValueError("Insufficient balance")
        self._balance_micro -= micro

    def __str__(self):
        return f"{self.ref} | {self.currency} {self.balance}"


# ── Transaction ───────────────────────────────────────────────────────────────
class Transaction(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref         = models.CharField(max_length=34, unique=True, default=_gen_txn_ref, editable=False)

    wallet      = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="transactions")
    txn_type    = models.CharField(max_length=16, choices=TransactionType.choices)
    status      = models.CharField(max_length=12, choices=TransactionStatus.choices,
                                   default=TransactionStatus.PENDING)

    # Amounts in micro-units
    _amount_micro   = models.BigIntegerField(db_column="amt_mu")
    _fee_micro      = models.BigIntegerField(default=0, db_column="fee_mu")
    currency        = models.CharField(max_length=3, choices=Currency.choices)

    # Counterparty — could be internal wallet ref or external identifier (hashed)
    counterparty_ref   = models.CharField(max_length=128, blank=True)
    counterparty_label = models.CharField(max_length=120, blank=True)  # display name only

    description    = models.CharField(max_length=255, blank=True)
    metadata       = models.JSONField(default=dict, blank=True)  # for external provider data

    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table  = "sp_txn"
        ordering  = ["-created_at"]
        indexes   = [models.Index(fields=["wallet", "status"]),
                     models.Index(fields=["ref"])]

    @property
    def amount(self) -> Decimal:
        return Decimal(self._amount_micro) / Decimal("1000000")

    @property
    def fee(self) -> Decimal:
        return Decimal(self._fee_micro) / Decimal("1000000")

    def __str__(self):
        return f"{self.ref} | {self.txn_type} {self.currency} {self.amount}"


# ── Micro Loan ────────────────────────────────────────────────────────────────
class MicroLoan(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref        = models.CharField(max_length=24, unique=True, default=_gen_loan_ref, editable=False)
    borrower   = models.ForeignKey(User, on_delete=models.PROTECT, related_name="loans")
    wallet     = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="loans")

    _principal_micro    = models.BigIntegerField(db_column="prin_mu")
    _outstanding_micro  = models.BigIntegerField(db_column="out_mu")
    currency            = models.CharField(max_length=3, choices=Currency.choices)

    # Rate stored as basis points (1% = 100 bps) — integer math, no floats
    interest_bps        = models.PositiveIntegerField(default=250)  # 2.5% default
    duration_days       = models.PositiveSmallIntegerField()
    status              = models.CharField(max_length=12, choices=LoanStatus.choices,
                                           default=LoanStatus.PENDING)

    # AI scoring snapshot at approval time (internal)
    _score_snapshot = models.PositiveSmallIntegerField(null=True, db_column="scr_snap")

    due_date    = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    repaid_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sp_ln"
        ordering = ["-created_at"]

    @property
    def principal(self) -> Decimal:
        return Decimal(self._principal_micro) / Decimal("1000000")

    @property
    def outstanding(self) -> Decimal:
        return Decimal(self._outstanding_micro) / Decimal("1000000")

    @property
    def interest_rate(self) -> Decimal:
        return Decimal(self.interest_bps) / Decimal("10000")

    def __str__(self):
        return f"{self.ref} | {self.currency} {self.principal} [{self.status}]"


# ── Savings Goal ──────────────────────────────────────────────────────────────
class SavingsGoal(models.Model):
    class Frequency(models.TextChoices):
        DAILY   = "D", "Daily"
        WEEKLY  = "W", "Weekly"
        MONTHLY = "M", "Monthly"

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref      = models.CharField(max_length=24, unique=True, default=_gen_savings_ref, editable=False)
    owner    = models.ForeignKey(User, on_delete=models.PROTECT, related_name="savings_goals")
    wallet   = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="savings_goals")

    name     = models.CharField(max_length=100)
    emoji    = models.CharField(max_length=8, default="🎯")

    _target_micro  = models.BigIntegerField(db_column="tgt_mu")
    _current_micro = models.BigIntegerField(default=0, db_column="cur_mu")
    currency       = models.CharField(max_length=3, choices=Currency.choices)

    auto_save      = models.BooleanField(default=False)
    frequency      = models.CharField(max_length=1, choices=Frequency.choices,
                                       default=Frequency.MONTHLY, blank=True)
    _auto_amount_micro = models.BigIntegerField(default=0, db_column="aa_mu")

    is_locked   = models.BooleanField(default=False)  # locked goals can't withdraw early
    target_date = models.DateField(null=True, blank=True)
    achieved_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sp_sav"

    @property
    def target(self) -> Decimal:
        return Decimal(self._target_micro) / Decimal("1000000")

    @property
    def current(self) -> Decimal:
        return Decimal(self._current_micro) / Decimal("1000000")

    @property
    def progress_pct(self) -> int:
        if self._target_micro == 0:
            return 0
        return min(100, int((self._current_micro / self._target_micro) * 100))

    def __str__(self):
        return f"{self.emoji} {self.name} — {self.progress_pct}%"


# ── Exchange Rate (cached) ────────────────────────────────────────────────────
class ExchangeRate(models.Model):
    """Cached FX rates refreshed by a Celery task."""
    from_currency = models.CharField(max_length=3, choices=Currency.choices)
    to_currency   = models.CharField(max_length=3, choices=Currency.choices)
    # Rate stored as micro-units of destination per 1 source (× 1,000,000)
    _rate_micro   = models.BigIntegerField(db_column="rate_mu")
    fetched_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table      = "sp_fx"
        unique_together = [("from_currency", "to_currency")]

    @property
    def rate(self) -> Decimal:
        return Decimal(self._rate_micro) / Decimal("1000000")

    def __str__(self):
        return f"{self.from_currency}→{self.to_currency} @ {self.rate}"