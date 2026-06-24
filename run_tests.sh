#!/bin/bash

# Exit on any failure
set -e

# Harmless visual spacer
echo ""
echo "========================================================"
echo "🧪 Running AIU Backend Integration Tests..."
echo "========================================================"
cd aiu-backend
npm run test
cd ..

echo ""
echo "========================================================"
echo "🧪 Running AIU Frontend Unit Tests..."
echo "========================================================"
cd aiu-web
npm run test
cd ..

echo ""
echo "--------------------------------------------------------"
echo "✅ All test suites passed successfully!"
echo "--------------------------------------------------------"
echo ""
