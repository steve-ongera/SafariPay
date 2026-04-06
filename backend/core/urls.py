from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import (
    SafariPayTokenView,
    AuthViewSet,
    WalletViewSet,
    TransactionViewSet,
    LoanViewSet,
    SavingsViewSet,
)

router = DefaultRouter()
router.register("auth",         AuthViewSet,        basename="auth")
router.register("wallets",      WalletViewSet,      basename="wallets")
router.register("transactions", TransactionViewSet, basename="transactions")
router.register("loans",        LoanViewSet,        basename="loans")
router.register("savings",      SavingsViewSet,     basename="savings")

urlpatterns = [
    path("", include(router.urls)),
    # JWT token endpoints
    path("auth/token/",         SafariPayTokenView.as_view(),  name="token_obtain"),
    path("auth/token/refresh/", TokenRefreshView.as_view(),    name="token_refresh"),
    path("auth/token/logout/",  TokenBlacklistView.as_view(),  name="token_blacklist"),
]