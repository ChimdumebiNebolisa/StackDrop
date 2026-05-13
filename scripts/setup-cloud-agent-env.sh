#!/usr/bin/env bash
set -euo pipefail

# StackDrop cloud-agent environment bootstrap.
# Installs local/offline dependencies needed for OCR, legacy .doc parsing,
# Tauri Linux builds/tests, Playwright Chromium, and Windows cross-builds.

sudo apt-get update
sudo apt-get install -y \
  antiword \
  poppler-utils \
  tesseract-ocr \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  nsis \
  llvm \
  lld \
  clang

rustup update stable
rustup default stable
rustup target add x86_64-pc-windows-msvc

cargo install cargo-xwin --locked --force

sudo ln -sf /usr/bin/clang /usr/local/bin/clang-cl
sudo ln -sf /usr/bin/llvm-lib /usr/local/bin/llvm-lib
sudo ln -sf /usr/bin/llvm-rc /usr/local/bin/llvm-rc
sudo ln -sf /usr/bin/makensis /usr/local/bin/makensis.exe

npm install
npx playwright install chromium

echo "StackDrop cloud-agent environment setup complete."
