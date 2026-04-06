"""
SafariPay Django Settings
Production-ready security defaults. Override via environment variables.
"""
import os
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-#8^nalg5(a6#gi%qs8$_h76-1i5h(b%emo6!lx&u=--q6cle*9'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Local
    "core",
]

MIDDLEWARE = [
     "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ── Auth ──────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = "core.User"

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ── DRF ───────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/hour",
        "user": "300/hour",
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 20,
}
 
# ── JWT ───────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":       timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME":      timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":       True,
    "BLACKLIST_AFTER_ROTATION":    True,
    "UPDATE_LAST_LOGIN":           True,
    "ALGORITHM":                   "HS256",
    "AUTH_HEADER_TYPES":           ("Bearer",),
    "AUTH_HEADER_NAME":            "HTTP_AUTHORIZATION",
    "USER_ID_FIELD":               "public_id",   # Never expose internal UUID
    "USER_ID_CLAIM":               "pid",
    "TOKEN_OBTAIN_SERIALIZER":     "apps.wallet.views.SafariPayTokenSerializer",
}
 
# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")
CORS_ALLOW_CREDENTIALS = True
 
# ── Cache (Redis) ─────────────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1"),
    }
}
 
# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL       = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND   = CELERY_BROKER_URL
CELERY_TIMEZONE         = "Africa/Nairobi"
 
# ── Internationalization ──────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE     = "Africa/Nairobi"
USE_I18N      = True
USE_TZ        = True
 
# ── Static ────────────────────────────────────────────────────────────────────
STATIC_URL  = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
 
MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
 
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
 
# ── Security headers (enforce in production) ──────────────────────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT               = True
    SECURE_HSTS_SECONDS               = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS    = True
    SECURE_HSTS_PRELOAD               = True
    SESSION_COOKIE_SECURE             = True
    CSRF_COOKIE_SECURE                = True
    SECURE_BROWSER_XSS_FILTER         = True
    SECURE_CONTENT_TYPE_NOSNIFF       = True
    X_FRAME_OPTIONS                   = "DENY"
