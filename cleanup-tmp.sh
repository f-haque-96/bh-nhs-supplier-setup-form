#!/bin/bash
# Cleanup script for temporary Claude Code files
# Run this script to remove all tmpclaude-*-cwd files

echo "Cleaning up temporary Claude Code files..."
rm -f tmpclaude-*-cwd
echo "✓ Cleanup complete!"
