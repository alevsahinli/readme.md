#!/bin/bash
set -e

# Claude Code Install Script
# Usage: curl -fsSL <url>/install.sh | bash

CLAUDE_CODE_PACKAGE="@anthropic-ai/claude-code"

echo "Installing Claude Code..."

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required. Install it from https://nodejs.org" >&2
  exit 1
fi

# Check for npm
if ! command -v npm &>/dev/null; then
  echo "Error: npm is required. Install it from https://nodejs.org" >&2
  exit 1
fi

NODE_VERSION=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo ok || echo fail)
if [ "$NODE_VERSION" = "fail" ]; then
  echo "Error: Node.js 18 or higher is required. Current version: $(node --version)" >&2
  exit 1
fi

# Install Claude Code globally
npm install -g "$CLAUDE_CODE_PACKAGE"

echo ""
echo "Claude Code installed successfully!"
echo "Run 'claude' to get started."
