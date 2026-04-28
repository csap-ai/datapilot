#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DESKTOP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
WEB_DIR=$(CDPATH= cd -- "$DESKTOP_DIR/../web" && pwd)

pnpm --dir "$WEB_DIR" build
rm -rf "$DESKTOP_DIR/frontend/dist"
cp -R "$WEB_DIR/dist" "$DESKTOP_DIR/frontend/dist"
