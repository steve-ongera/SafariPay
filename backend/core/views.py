from django.db import transaction as db_transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from decimal import Decimal

from .models import Wallet, Transaction, MicroLoan, SavingsGoal, Currency
from .models import TransactionType, TransactionStatus, LoanStatus
from .serializers import (
    UserProfileSerializer, RegisterSerializer, SetPinSerializer,
    WalletSerializer, CreateWalletSerializer,
    TransactionSerializer, SendMoneySerializer, DepositSerializer,
    MicroLoanSerializer, LoanApplicationSerializer, LoanRepaySerializer,
    SavingsGoalSerializer, CreateSavingsGoalSerializer, SavingsDepositSerializer,
)

User = get_user_model()


# ── Token customization ───────────────────────────────────────────────────────
class SafariPayTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed non-sensitive claims; public_id not UUID
        token["pid"]  = user.public_id
        token["tier"] = user.tier
        return token


class SafariPayTokenView(TokenObtainPairView):
    serializer_class = SafariPayTokenSerializer


# ── Auth / User ───────────────────────────────────────────────────────────────
class AuthViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    throttle_classes   = [AnonRateThrottle]

    @action(methods=["post"], detail=False, url_path="register")
    def register(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(
            {"message": "Account created successfully.", "public_id": user.public_id},
            status=status.HTTP_201_CREATED,
        )

    @action(methods=["get", "patch"], detail=False, url_path="me",
            permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        if request.method == "GET":
            return Response(UserProfileSerializer(request.user).data)
        ser = UserProfileSerializer(request.user, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    @action(methods=["post"], detail=False, url_path="set-pin",
            permission_classes=[permissions.IsAuthenticated])
    def set_pin(self, request):
        ser = SetPinSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        if user.pin_hash:
            current = ser.validated_data.get("current", "")
            if not user.check_transaction_pin(current):
                return Response({"error": "Current PIN is incorrect."},
                                status=status.HTTP_400_BAD_REQUEST)
        user.set_transaction_pin(ser.validated_data["pin"])
        user.save(update_fields=["pin_hash"])
        return Response({"message": "Transaction PIN set successfully."})


# ── Wallet ────────────────────────────────────────────────────────────────────
class WalletViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes   = [UserRateThrottle]

    def get_queryset(self):
        return Wallet.objects.filter(owner=self.request.user)

    def list(self, request):
        wallets = self.get_queryset()
        return Response(WalletSerializer(wallets, many=True).data)

    @action(methods=["post"], detail=False, url_path="create")
    def create_wallet(self, request):
        ser = CreateWalletSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        wallet = Wallet.objects.create(
            owner=request.user, currency=ser.validated_data["currency"]
        )
        return Response(WalletSerializer(wallet).data, status=status.HTTP_201_CREATED)

    @action(methods=["post"], detail=False, url_path="send")
    def send_money(self, request):
        ser = SendMoneySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        # PIN check
        if not request.user.check_transaction_pin(d["pin"]):
            return Response({"error": "Invalid transaction PIN."},
                            status=status.HTTP_403_FORBIDDEN)

        try:
            source = Wallet.objects.select_for_update().get(
                ref=d["from_wallet"], owner=request.user
            )
        except Wallet.DoesNotExist:
            return Response({"error": "Source wallet not found."}, status=404)

        if source.is_frozen:
            return Response({"error": "Source wallet is frozen."}, status=400)

        # Resolve recipient
        recipient_wallet = self._resolve_recipient(d["to_identifier"], source.currency)
        if not recipient_wallet:
            return Response({"error": "Recipient not found."}, status=404)

        amount = d["amount"]
        fee    = self._calculate_fee(amount)
        total  = amount + fee

        with db_transaction.atomic():
            source.debit(total)
            source.save(update_fields=["_balance_micro", "updated_at"])

            recipient_wallet.credit(amount)
            recipient_wallet.save(update_fields=["_balance_micro", "updated_at"])

            now = timezone.now()
            Transaction.objects.create(
                wallet=source,
                txn_type=TransactionType.SEND,
                status=TransactionStatus.COMPLETED,
                _amount_micro=int(amount * 1_000_000),
                _fee_micro=int(fee * 1_000_000),
                currency=source.currency,
                counterparty_ref=recipient_wallet.ref,
                counterparty_label=str(recipient_wallet.owner.display_name or ""),
                description=d.get("description", ""),
                completed_at=now,
            )
            Transaction.objects.create(
                wallet=recipient_wallet,
                txn_type=TransactionType.RECEIVE,
                status=TransactionStatus.COMPLETED,
                _amount_micro=int(amount * 1_000_000),
                _fee_micro=0,
                currency=source.currency,
                counterparty_ref=source.ref,
                counterparty_label=str(request.user.display_name or ""),
                description=d.get("description", ""),
                completed_at=now,
            )

        return Response({"message": "Transfer successful.", "fee": str(fee)})

    @action(methods=["post"], detail=False, url_path="deposit")
    def deposit(self, request):
        """Initiate deposit — in production, triggers M-Pesa STK push etc."""
        ser = DepositSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            wallet = Wallet.objects.get(ref=d["wallet"], owner=request.user)
        except Wallet.DoesNotExist:
            return Response({"error": "Wallet not found."}, status=404)

        # Placeholder: in production this triggers STK push / card tokenization
        # For now we simulate an immediate credit (dev mode)
        amount = d["amount"]
        with db_transaction.atomic():
            wallet.credit(amount)
            wallet.save(update_fields=["_balance_micro", "updated_at"])
            Transaction.objects.create(
                wallet=wallet,
                txn_type=TransactionType.DEPOSIT,
                status=TransactionStatus.COMPLETED,
                _amount_micro=int(amount * 1_000_000),
                currency=wallet.currency,
                counterparty_label=d["provider"],
                completed_at=timezone.now(),
            )

        return Response({"message": "Deposit successful.", "new_balance": str(wallet.balance)})

    def _resolve_recipient(self, identifier, currency):
        """Find recipient wallet by public_id, phone, or wallet ref."""
        try:
            return Wallet.objects.select_for_update().get(ref=identifier, currency=currency)
        except Wallet.DoesNotExist:
            pass
        try:
            user = User.objects.get(public_id=identifier)
            return Wallet.objects.select_for_update().get(owner=user, currency=currency)
        except (User.DoesNotExist, Wallet.DoesNotExist):
            pass
        try:
            user = User.objects.get(phone=identifier)
            return Wallet.objects.select_for_update().get(owner=user, currency=currency)
        except (User.DoesNotExist, Wallet.DoesNotExist):
            return None

    @staticmethod
    def _calculate_fee(amount: Decimal) -> Decimal:
        """Tiered fee — cheaper than M-Pesa."""
        if amount <= 100:    return Decimal("0")
        if amount <= 1000:   return Decimal("5")
        if amount <= 5000:   return Decimal("15")
        if amount <= 20000:  return Decimal("35")
        if amount <= 100000: return Decimal("60")
        return Decimal("100")


# ── Transactions ──────────────────────────────────────────────────────────────
class TransactionViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        wallet_refs = Wallet.objects.filter(
            owner=self.request.user
        ).values_list("ref", flat=True)
        qs = Transaction.objects.filter(wallet__ref__in=wallet_refs)

        # Filters
        txn_type = self.request.query_params.get("type")
        if txn_type:
            qs = qs.filter(txn_type=txn_type)
        wallet = self.request.query_params.get("wallet")
        if wallet:
            qs = qs.filter(wallet__ref=wallet)
        return qs[:100]   # cap at 100 most recent

    def list(self, request):
        return Response(TransactionSerializer(self.get_queryset(), many=True).data)

    def retrieve(self, request, pk=None):
        try:
            txn = Transaction.objects.get(ref=pk, wallet__owner=request.user)
        except Transaction.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        return Response(TransactionSerializer(txn).data)


# ── Loans ─────────────────────────────────────────────────────────────────────
class LoanViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MicroLoan.objects.filter(borrower=self.request.user)

    def list(self, request):
        return Response(MicroLoanSerializer(self.get_queryset(), many=True).data)

    @action(methods=["post"], detail=False, url_path="apply")
    def apply(self, request):
        ser = LoanApplicationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            wallet = Wallet.objects.get(ref=d["wallet"], owner=request.user)
        except Wallet.DoesNotExist:
            return Response({"error": "Wallet not found."}, status=404)

        # Basic eligibility: no active loans
        if MicroLoan.objects.filter(
            borrower=request.user, status__in=[LoanStatus.ACTIVE, LoanStatus.APPROVED]
        ).exists():
            return Response({"error": "You have an active loan. Repay it first."}, status=400)

        # AI credit scoring (simplified — in production a full ML model)
        score = request.user._credit_score
        if score < 350:
            return Response({"error": "Credit score too low for this loan amount."}, status=400)

        amount = d["amount"]
        interest_bps = self._score_to_rate(score)

        loan = MicroLoan.objects.create(
            borrower=request.user,
            wallet=wallet,
            _principal_micro=int(amount * 1_000_000),
            _outstanding_micro=int(amount * 1_000_000),
            currency=wallet.currency,
            interest_bps=interest_bps,
            duration_days=d["duration_days"],
            status=LoanStatus.PENDING,
            _score_snapshot=score,
        )
        return Response(
            {"message": "Loan application submitted.", "ref": loan.ref,
             "interest_rate": f"{interest_bps / 100:.2f}%"},
            status=201,
        )

    @action(methods=["post"], detail=False, url_path="repay")
    def repay(self, request):
        ser = LoanRepaySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        if not request.user.check_transaction_pin(d["pin"]):
            return Response({"error": "Invalid PIN."}, status=403)

        try:
            loan = MicroLoan.objects.get(ref=d["loan"], borrower=request.user,
                                          status=LoanStatus.ACTIVE)
        except MicroLoan.DoesNotExist:
            return Response({"error": "Active loan not found."}, status=404)

        wallet = loan.wallet
        amount = d["amount"]

        with db_transaction.atomic():
            wallet.debit(amount)
            wallet.save(update_fields=["_balance_micro", "updated_at"])

            repay_micro = int(amount * 1_000_000)
            loan._outstanding_micro = max(0, loan._outstanding_micro - repay_micro)

            if loan._outstanding_micro == 0:
                loan.status = LoanStatus.REPAID
                loan.repaid_at = timezone.now()
                # Reward: boost credit score
                request.user._credit_score = min(850, request.user._credit_score + 20)
                request.user.save(update_fields=["_credit_score"])
            loan.save()

            Transaction.objects.create(
                wallet=wallet,
                txn_type=TransactionType.LOAN_DEBIT,
                status=TransactionStatus.COMPLETED,
                _amount_micro=repay_micro,
                currency=wallet.currency,
                counterparty_label="SafariPay Loan",
                completed_at=timezone.now(),
            )

        return Response({
            "message": "Repayment recorded.",
            "outstanding": str(loan.outstanding),
            "status": loan.status,
        })

    @staticmethod
    def _score_to_rate(score: int) -> int:
        """Map credit score to interest basis points."""
        if score >= 750: return 150   # 1.5%
        if score >= 650: return 200   # 2.0%
        if score >= 550: return 275   # 2.75%
        return 350                     # 3.5%


# ── Savings ───────────────────────────────────────────────────────────────────
class SavingsViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(owner=self.request.user)

    def list(self, request):
        return Response(SavingsGoalSerializer(self.get_queryset(), many=True).data)

    @action(methods=["post"], detail=False, url_path="create")
    def create_goal(self, request):
        ser = CreateSavingsGoalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            wallet = Wallet.objects.get(ref=d["wallet"], owner=request.user)
        except Wallet.DoesNotExist:
            return Response({"error": "Wallet not found."}, status=404)

        goal = SavingsGoal.objects.create(
            owner=request.user,
            wallet=wallet,
            name=d["name"],
            emoji=d.get("emoji", "🎯"),
            _target_micro=int(d["target_amount"] * 1_000_000),
            currency=wallet.currency,
            target_date=d.get("target_date"),
            auto_save=d.get("auto_save", False),
            frequency=d.get("frequency", SavingsGoal.Frequency.MONTHLY),
            _auto_amount_micro=int(d.get("auto_amount", 0) * 1_000_000),
            is_locked=d.get("is_locked", False),
        )
        return Response(SavingsGoalSerializer(goal).data, status=201)

    @action(methods=["post"], detail=False, url_path="deposit")
    def deposit(self, request):
        ser = SavingsDepositSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        if not request.user.check_transaction_pin(d["pin"]):
            return Response({"error": "Invalid PIN."}, status=403)

        try:
            goal = SavingsGoal.objects.get(ref=d["goal"], owner=request.user)
        except SavingsGoal.DoesNotExist:
            return Response({"error": "Goal not found."}, status=404)

        wallet = goal.wallet
        amount = d["amount"]

        with db_transaction.atomic():
            wallet.debit(amount)
            wallet.save(update_fields=["_balance_micro", "updated_at"])

            goal._current_micro += int(amount * 1_000_000)
            if goal._current_micro >= goal._target_micro and not goal.achieved_at:
                goal.achieved_at = timezone.now()
            goal.save()

            Transaction.objects.create(
                wallet=wallet,
                txn_type=TransactionType.SAVINGS_IN,
                status=TransactionStatus.COMPLETED,
                _amount_micro=int(amount * 1_000_000),
                currency=wallet.currency,
                counterparty_label=goal.name,
                completed_at=timezone.now(),
            )

        return Response({
            "message": "Saved successfully! 🎉" if goal.achieved_at else "Deposit recorded.",
            "progress": goal.progress_pct,
            "current": str(goal.current),
            "achieved": bool(goal.achieved_at),
        })