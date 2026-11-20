#!/usr/bin/env bash
# Builds the Laravel API: creates a fresh Laravel 11 app, installs Sanctum + DomPDF,
# then copies this folder's app code on top.
#   usage:  ./setup.sh [target-dir]        (default: ../ssms-api)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$HERE/../ssms-api}"

command -v php >/dev/null      || { echo "PHP 8.2+ is required"; exit 1; }
command -v composer >/dev/null || { echo "Composer is required"; exit 1; }

composer create-project laravel/laravel:^11.0 "$TARGET"
cd "$TARGET"

php artisan install:api --no-interaction          # Sanctum + routes/api.php
composer require barryvdh/laravel-dompdf --no-interaction

# Our users migration (with roles/departments/districts) replaces Laravel's default one.
rm -f database/migrations/0001_01_01_000000_create_users_table.php

# Copy the application code over the fresh skeleton.
for d in app bootstrap config database resources routes tests; do
  mkdir -p "$d"
  cp -R "$HERE/$d/." "$d/"
done

# Make API tokens expire (8 hours by default; change SANCTUM_EXPIRATION in .env, in minutes).
php artisan vendor:publish --provider="Laravel\\Sanctum\\SanctumServiceProvider" --tag=sanctum-config --no-interaction || true
[ -f config/sanctum.php ] && sed -i "s/'expiration' => null,/'expiration' => (int) env('SANCTUM_EXPIRATION', 480),/" config/sanctum.php

# API only uses bearer tokens, so sessions can live in files (no sessions table needed).
sed -i.bak 's/^SESSION_DRIVER=.*/SESSION_DRIVER=file/' .env && rm -f .env.bak
grep -q '^CORS_ALLOWED_ORIGINS' .env || echo 'CORS_ALLOWED_ORIGINS=http://localhost:5173' >> .env
grep -q '^FRONTEND_URL' .env || echo 'FRONTEND_URL=http://localhost:5173' >> .env
grep -q '^ADMIN_PASSWORD' .env || echo 'ADMIN_PASSWORD=ChangeMe#12345' >> .env

php artisan migrate:fresh --seed --no-interaction

echo
echo "API ready in: $TARGET"
echo "Run it:   cd \"$TARGET\" && php artisan serve      (http://localhost:8000)"
echo "Test it:  php artisan test"
