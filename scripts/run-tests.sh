#!/usr/bin/env bash
# run-tests.sh — Run all smoke test suites
# Usage: bash scripts/run-tests.sh

set -e
PASS=0
FAIL=0

echo "Running cadence-state.js smoke tests..."
echo "========================================="
if node scripts/test-cadence-state.js; then
  PASS=$((PASS + 1))
else
  FAIL=$((FAIL + 1))
fi

echo ""
echo "Running room-watcher.js smoke tests..."
echo "========================================="
if node scripts/test-room-watcher.js; then
  PASS=$((PASS + 1))
else
  FAIL=$((FAIL + 1))
fi

echo ""
echo "========================================="
echo "Suites: $PASS passed, $FAIL failed"
echo "========================================="

exit $FAIL
