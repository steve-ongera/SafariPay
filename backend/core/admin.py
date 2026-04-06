from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Wallet, Transaction, MicroLoan, SavingsGoal, ExchangeRate


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ("public_id", "email", "get_full_name", "tier", "kyc_level", "is_active", "date_joined")
    list_filter   = ("tier", "kyc_level", "is_active", "is_staff")
    search_fields = ("email", "public_id", "phone")
    ordering      = ("-date_joined",)
    readonly_fields = ("id", "public_id", "date_joined", "last_login")

    fieldsets = (
        ("Identity",    {"fields": ("id", "public_id", "email", "first_name", "last_name", "display_name", "phone")}),
        ("Status",      {"fields": ("tier", "kyc_level", "is_active", "is_staff", "is_superuser")}),
        ("Security",    {"fields": ("password", "pin_hash"), "classes": ("collapse",)}),
        ("AI Internals",{"fields": ("_credit_score", "_risk_band"), "classes": ("collapse",)}),
        ("Timestamps",  {"fields": ("date_joined", "last_login")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  ("email", "first_name", "last_name", "password1", "password2"),
        }),
    )

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    get_full_name.short_description = "Name"


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display  = ("ref", "owner", "currency", "balance", "is_primary", "is_frozen", "created_at")
    list_filter   = ("currency", "is_frozen", "is_primary")
    search_fields = ("ref", "owner__email", "owner__public_id")
    readonly_fields = ("id", "ref", "created_at", "updated_at")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ("ref", "wallet", "txn_type", "status", "amount", "currency", "created_at")
    list_filter   = ("txn_type", "status", "currency")
    search_fields = ("ref", "wallet__ref", "counterparty_ref")
    readonly_fields = ("id", "ref", "created_at", "completed_at")


@admin.register(MicroLoan)
class MicroLoanAdmin(admin.ModelAdmin):
    list_display  = ("ref", "borrower", "principal", "outstanding", "currency", "status", "due_date")
    list_filter   = ("status", "currency")
    search_fields = ("ref", "borrower__email", "borrower__public_id")
    readonly_fields = ("id", "ref", "created_at", "approved_at", "repaid_at")


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display  = ("ref", "owner", "name", "currency", "progress_pct", "is_locked", "target_date")
    list_filter   = ("currency", "is_locked", "auto_save")
    search_fields = ("ref", "name", "owner__email")
    readonly_fields = ("id", "ref", "created_at", "achieved_at")


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ("from_currency", "to_currency", "rate", "fetched_at")
    readonly_fields = ("fetched_at",)