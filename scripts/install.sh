#!/bin/sh
# Install GPC standalone binary
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.sh | sh
#   curl -fsSL ... | sh -s -- --version v0.9.0
#   curl -fsSL ... | sh -s -- --dir ~/.local/bin

set -e

REPO="yasserstudio/gpc"
INSTALL_DIR="${GPC_INSTALL_DIR:-/usr/local/bin}"
VERSION=""

# Parse args
while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="darwin" ;;
  Linux)  PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*)
    # Windows via Git Bash / MSYS2 / Cygwin
    ASSET="gpc-windows-x64.exe"
    WIN_INSTALL_DIR="${LOCALAPPDATA:-$USERPROFILE/AppData/Local}/Programs/gpc"
    echo "Detected: Windows x64"

    if [ -n "$VERSION" ]; then
      TAG="$VERSION"
    else
      TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)
      if [ -z "$TAG" ]; then
        echo "Error: Could not determine latest release"
        exit 1
      fi
    fi
    echo "Release: ${TAG}"
    URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
    echo "Downloading ${URL}..."
    TMPFILE="$(mktemp).exe"
    trap 'rm -f "$TMPFILE"' EXIT
    if ! curl -fsSL -o "$TMPFILE" "$URL"; then
      echo "Error: Download failed."
      echo "Install via npm instead: npm install -g @gpc-cli/cli"
      exit 1
    fi
    mkdir -p "$WIN_INSTALL_DIR"
    cp "$TMPFILE" "${WIN_INSTALL_DIR}/gpc.exe"
    echo "Installed to ${WIN_INSTALL_DIR}/gpc.exe"
    echo "Add ${WIN_INSTALL_DIR} to your PATH to use 'gpc' from any terminal."
    exit 0
    ;;
  *)
    echo "Error: Unsupported OS: $OS"
    echo "Supported: macOS (Darwin), Linux, Windows (Git Bash/MSYS2/Cygwin)"
    echo "Windows (PowerShell): iwr https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.ps1 | iex"
    exit 1
    ;;
esac

case "$ARCH" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64)  ARCH="x64" ;;
  *)
    echo "Error: Unsupported architecture: $ARCH"
    echo "Supported: arm64, x64"
    exit 1
    ;;
esac

ASSET="gpc-${PLATFORM}-${ARCH}"
echo "Detected: ${PLATFORM}-${ARCH}"

# Get release tag
if [ -n "$VERSION" ]; then
  TAG="$VERSION"
else
  TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)
  if [ -z "$TAG" ]; then
    echo "Error: Could not determine latest release"
    exit 1
  fi
fi

echo "Release: ${TAG}"

# Download binary
URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
echo "Downloading ${URL}..."

TMPFILE="$(mktemp)"
trap 'rm -f "$TMPFILE"' EXIT

if ! curl -fsSL -o "$TMPFILE" "$URL"; then
  echo "Error: Download failed. Binary may not be available for ${PLATFORM}-${ARCH}."
  echo "Install via npm instead: npm install -g @gpc-cli/cli"
  exit 1
fi

# Verify checksum if available
CHECKSUM_URL="https://github.com/${REPO}/releases/download/${TAG}/checksums.txt"
CHECKSUMS="$(curl -fsSL "$CHECKSUM_URL" 2>/dev/null || true)"

if [ -n "$CHECKSUMS" ]; then
  EXPECTED=$(echo "$CHECKSUMS" | grep "$ASSET" | awk '{print $1}')
  if [ -n "$EXPECTED" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      ACTUAL=$(sha256sum "$TMPFILE" | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
      ACTUAL=$(shasum -a 256 "$TMPFILE" | awk '{print $1}')
    else
      ACTUAL=""
    fi

    if [ -n "$ACTUAL" ] && [ "$ACTUAL" != "$EXPECTED" ]; then
      echo "Error: Checksum mismatch!"
      echo "  Expected: ${EXPECTED}"
      echo "  Got:      ${ACTUAL}"
      exit 1
    fi

    if [ -n "$ACTUAL" ]; then
      echo "Checksum verified."
    fi
  fi
fi

# Install
chmod +x "$TMPFILE"

if [ -w "$INSTALL_DIR" ]; then
  mv "$TMPFILE" "${INSTALL_DIR}/gpc"
else
  echo "Installing to ${INSTALL_DIR} (requires sudo)..."
  sudo mv "$TMPFILE" "${INSTALL_DIR}/gpc"
fi

echo "Installed: $(command -v gpc || echo "${INSTALL_DIR}/gpc")"
echo "Run 'gpc --version' to verify."
