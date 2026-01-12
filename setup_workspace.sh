#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="./workspace"
PKG_DIR="spa-npm"
DEMO_DIR="spa-demo"
DEMO_PORT="5173"

if [ -d "$WORKSPACE_DIR" ]; then
  echo "Workspace already exists at $WORKSPACE_DIR. Remove it or choose a new location."
  exit 1
fi

read -r -p "Enter your Splunk RUM realm (e.g., us1): " RUM_REALM
read -r -p "Enter your Splunk RUM access token: " RUM_TOKEN

mkdir -p "$WORKSPACE_DIR"

cp -R "$PKG_DIR" "$WORKSPACE_DIR/"
cp -R "$DEMO_DIR" "$WORKSPACE_DIR/"

RUM_CONFIG="$WORKSPACE_DIR/$DEMO_DIR/src/rum.config.ts"
perl -pi -e "s/realm: \\\".*?\\\"/realm: \\\"${RUM_REALM}\\\"/g" "$RUM_CONFIG"
perl -pi -e "s/rumAccessToken: \\\".*?\\\"/rumAccessToken: \\\"${RUM_TOKEN}\\\"/g" "$RUM_CONFIG"

echo "Building spa-npm..."
(cd "$WORKSPACE_DIR/$PKG_DIR" && npm install && npm run build)

echo "Installing spa-demo..."
(cd "$WORKSPACE_DIR/$DEMO_DIR" && npm install)

echo "Starting spa-demo..."
(cd "$WORKSPACE_DIR/$DEMO_DIR" && npm run dev -- --host > "$WORKSPACE_DIR/spa-demo.log" 2>&1 &)

sleep 2

URL="http://localhost:${DEMO_PORT}/"
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  echo "Open this URL in your browser: $URL"
fi

echo "spa-demo is running. Logs: $WORKSPACE_DIR/spa-demo.log"
