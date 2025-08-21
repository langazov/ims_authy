#!/usr/bin/env bash
set -euo pipefail

# build-package.sh
# Creates ims-authy-sso.zip ready for upload to WordPress.org or manual plugin upload.
# Run from the repository root or directly: frameworks/wordpress-sso/build-package.sh

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_NAME="ims-authy-sso"
TMPDIR="$(mktemp -d)"
OUT_ZIP="$PLUGIN_DIR/${PLUGIN_NAME}.zip"


rm "$OUT_ZIP"

echo "Building plugin package..."

echo "plugin dir: $PLUGIN_DIR"

echo "temp dir: $TMPDIR"

# Copy files to temp dir under the desired plugin folder name
mkdir -p "$TMPDIR/$PLUGIN_NAME"

# Use rsync if available to exclude common dev artifacts
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='.git' --exclude='node_modules' --exclude='vendor' --exclude='.DS_Store' --exclude='*.log' --exclude='*.cache' "$PLUGIN_DIR/" "$TMPDIR/$PLUGIN_NAME/"
else
  # Fallback to cp and prune
  cp -a "$PLUGIN_DIR/" "$TMPDIR/$PLUGIN_NAME/"
  rm -rf "$TMPDIR/$PLUGIN_NAME/.git" "$TMPDIR/$PLUGIN_NAME/node_modules" "$TMPDIR/$PLUGIN_NAME/vendor" || true
  find "$TMPDIR/$PLUGIN_NAME" -name ".DS_Store" -delete || true
fi

# Remove the build script itself from the package
rm -f "$TMPDIR/$PLUGIN_NAME/build-package.sh"

# Create zip
pushd "$TMPDIR" >/dev/null
if command -v zip >/dev/null 2>&1; then
  zip -r "$OUT_ZIP" "$PLUGIN_NAME" >/dev/null
else
  # Use python fallback to create zip if zip not available
  python3 - <<PY
import shutil
shutil.make_archive(r"${OUT_ZIP%.*}", 'zip', r"$TMPDIR", r"$PLUGIN_NAME")
PY
fi
popd >/dev/null

# Cleanup
rm -rf "$TMPDIR"

echo "Created package: $OUT_ZIP"

exit 0
