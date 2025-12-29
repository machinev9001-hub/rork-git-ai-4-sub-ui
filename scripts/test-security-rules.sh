#!/bin/bash

# Firebase Security Rules Testing Script

set -e

echo "🔐 Firebase Security Rules Test Suite"
echo "======================================"
echo ""

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "📦 Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"

# Check if rules-unit-testing is installed
if ! npm list @firebase/rules-unit-testing &> /dev/null; then
    echo "⚠️  @firebase/rules-unit-testing not found"
    echo "📦 Installing..."
    npm install --save-dev @firebase/rules-unit-testing
fi

echo "✅ Testing dependencies installed"
echo ""

# Start Firebase Emulator
echo "🚀 Starting Firebase Emulator..."
firebase emulators:start --only firestore --project test-project &
EMULATOR_PID=$!

# Wait for emulator to start
echo "⏳ Waiting for emulator to be ready..."
sleep 5

# Run tests
echo ""
echo "🧪 Running security rules tests..."
npm test -- __tests__/firestore.rules.test.ts

# Cleanup
echo ""
echo "🛑 Stopping emulator..."
kill $EMULATOR_PID

echo ""
echo "✅ All tests completed!"
