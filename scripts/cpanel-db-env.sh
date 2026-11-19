#!/usr/bin/env bash
# Jalankan di Terminal cPanel:
#   source ~/cpanel-db-env.sh
#
# Script ini hanya menyimpan host/user/database. Password diminta setiap sesi
# lewat prompt tersembunyi dan TIDAK ditulis ke file.
#
# Jika user/database berbeda:
#   PGUSER=user_lain PGDATABASE=db_lain source ~/cpanel-db-env.sh

export PGHOST="${PGHOST:-localhost}"
export PGUSER="${PGUSER:-ktimmgvh_kelasbit}"
export PGDATABASE="${PGDATABASE:-ktimmgvh_kelasbit}"

read -r -s -p "Password DB (${PGUSER}): " PGPASSWORD
echo
export PGPASSWORD

psql -c "select current_user, current_database();"
