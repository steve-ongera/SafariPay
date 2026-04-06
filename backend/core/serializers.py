from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from decimal import Decimal
from .models import Wallet, Transaction, MicroLoan, SavingsGoal, Currency

User = get_user_model()


# ── Helper ────────────────────────────────────────────────────────────────────
class MoneyField(serializers.DecimalField):
    """Always 2 dp, no trailing zeros reveal internal precision."""
    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 18)
        kwargs.setdefault("decimal_places", 2)
        kwargs.setdefault("coerce_to_string", True)
        super().__init__(**kwargs)


# ── User ──────────────────────────────────────────────────────────────────────
class UserPublicSerializer(serializers.ModelSerializer):
    """Read-only, safe fields only. Internal UUID, credit score, risk band are NEVER exposed."""
    name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["public_id", "name", "display_name", "tier", "kyc_level", "date_joined"]
        read_only_fields = fields

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class UserProfileSerializer(serializers.ModelSerializer):
    """Extended profile for authenticated owner only."""
    name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "public_id", "name", "display_name", "email", "phone",
            "tier", "kyc_level", "date_joined", "last_login",
        ]
        read_only_fields = [
            "public_id", "email", "tier", "kyc_level", "date_joined", "last_login"
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class RegisterSerializer(serializers.Serializer):
    email        = serializers.EmailField()
    first_name   = serializers.CharField(max_length=60)
    last_name    = serializers.CharField(max_length=60)
    phone        = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password     = serializers.CharField(min_length=8, write_only=True)
    password2    = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, data):
        if data["password"] != data.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return data

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                email      = validated_data["email"],
                password   = validated_data["password"],
                first_name = validated_data["first_name"],
                last_name  = validated_data["last_name"],
                phone      = validated_data.get("phone", ""),
                display_name = f"{validated_data['first_name']} {validated_data['last_name']}",
            )
            # Auto-create primary KES wallet
            Wallet.objects.create(owner=user, currency=Currency.KES, is_primary=True)
        return user


class SetPinSerializer(serializers.Serializer):
    pin     = serializers.CharField(min_length=4, max_length=4)
    pin2    = serializers.CharField(min_length=4, max_length=4)
    current = serializers.CharField(required=False, write_only=True)

    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("PIN must be 4 digits.")
        return value

    def validate(self, data):
        if data["pin"] != data["pin2"]:
            raise serializers.ValidationError({"pin2": "PINs do not match."})
        return data


# ── Wallet ────────────────────────────────────────────────────────────────────
class WalletSerializer(serializers.ModelSerializer):
    balance    = MoneyField(read_only=True)
    owner_id   = serializers.CharField(source="owner.public_id", read_only=True)

    class Meta:
        model  = Wallet
        fields = ["ref", "owner_id", "currency", "balance", "is_primary",
                  "is_frozen", "created_at", "updated_at"]
        read_only_fields = fields


class CreateWalletSerializer(serializers.Serializer):
    currency = serializers.ChoiceField(choices=Currency.choices)

    def validate_currency(self, value):
        user = self.context["request"].user
        if Wallet.objects.filter(owner=user, currency=value).exists():
            raise serializers.ValidationError(f"You already have a {value} wallet.")
        return value


# ── Transaction ───────────────────────────────────────────────────────────────
class TransactionSerializer(serializers.ModelSerializer):
    amount   = MoneyField(read_only=True)
    fee      = MoneyField(read_only=True)
    wallet   = serializers.CharField(source="wallet.ref", read_only=True)

    class Meta:
        model  = Transaction
        fields = [
            "ref", "wallet", "txn_type", "status", "amount", "fee",
            "currency", "counterparty_label", "description",
            "created_at", "completed_at",
        ]
        read_only_fields = fields


class SendMoneySerializer(serializers.Serializer):
    from_wallet   = serializers.CharField()         # wallet ref
    to_identifier = serializers.CharField()         # recipient public_id or phone or wallet ref
    amount        = MoneyField()
    pin           = serializers.CharField(min_length=4, max_length=4, write_only=True)
    description   = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Invalid PIN.")
        return value


class DepositSerializer(serializers.Serializer):
    wallet   = serializers.CharField()
    amount   = MoneyField()
    provider = serializers.ChoiceField(choices=["MPESA", "CARD", "BANK"])
    phone    = serializers.CharField(required=False)  # for MPESA


# ── Loans ────────────────────────────────────────────────────────────────────
class MicroLoanSerializer(serializers.ModelSerializer):
    principal   = MoneyField(read_only=True)
    outstanding = MoneyField(read_only=True)
    interest_rate = serializers.SerializerMethodField()
    borrower_id = serializers.CharField(source="borrower.public_id", read_only=True)
    wallet_ref  = serializers.CharField(source="wallet.ref", read_only=True)

    class Meta:
        model  = MicroLoan
        fields = [
            "ref", "borrower_id", "wallet_ref", "principal", "outstanding",
            "currency", "interest_rate", "duration_days", "status",
            "due_date", "created_at", "approved_at", "repaid_at",
        ]
        read_only_fields = fields

    def get_interest_rate(self, obj):
        return f"{float(obj.interest_rate * 100):.2f}%"


class LoanApplicationSerializer(serializers.Serializer):
    wallet        = serializers.CharField()
    amount        = MoneyField()
    duration_days = serializers.IntegerField(min_value=7, max_value=180)
    purpose       = serializers.CharField(max_length=255)

    def validate_amount(self, value):
        if value < Decimal("100"):
            raise serializers.ValidationError("Minimum loan amount is 100.")
        if value > Decimal("500000"):
            raise serializers.ValidationError("Maximum loan amount is 500,000.")
        return value


class LoanRepaySerializer(serializers.Serializer):
    loan   = serializers.CharField()   # loan ref
    amount = MoneyField()
    pin    = serializers.CharField(min_length=4, max_length=4, write_only=True)


# ── Savings ───────────────────────────────────────────────────────────────────
class SavingsGoalSerializer(serializers.ModelSerializer):
    target      = MoneyField(read_only=True)
    current     = MoneyField(read_only=True)
    progress    = serializers.IntegerField(source="progress_pct", read_only=True)
    wallet_ref  = serializers.CharField(source="wallet.ref", read_only=True)

    class Meta:
        model  = SavingsGoal
        fields = [
            "ref", "wallet_ref", "name", "emoji", "target", "current",
            "currency", "progress", "auto_save", "frequency",
            "is_locked", "target_date", "achieved_at", "created_at",
        ]
        read_only_fields = ["ref", "wallet_ref", "current", "progress", "achieved_at", "created_at"]


class CreateSavingsGoalSerializer(serializers.Serializer):
    wallet        = serializers.CharField()
    name          = serializers.CharField(max_length=100)
    emoji         = serializers.CharField(max_length=8, default="🎯")
    target_amount = MoneyField()
    target_date   = serializers.DateField(required=False, allow_null=True)
    auto_save     = serializers.BooleanField(default=False)
    frequency     = serializers.ChoiceField(
        choices=SavingsGoal.Frequency.choices, default=SavingsGoal.Frequency.MONTHLY,
        required=False
    )
    auto_amount   = MoneyField(required=False, default=0)
    is_locked     = serializers.BooleanField(default=False)

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Target must be greater than zero.")
        return value


class SavingsDepositSerializer(serializers.Serializer):
    goal   = serializers.CharField()    # goal ref
    amount = MoneyField()
    pin    = serializers.CharField(min_length=4, max_length=4, write_only=True)