#!/bin/bash

echo "Stopping all processes..."
pkill -f "expo\|metro\|node" || true
sleep 2

echo "Cleaning caches..."
rm -rf node_modules
rm -rf .expo
rm -rf $HOME/.expo
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/react-* 2>/dev/null || true

echo "Reinstalling..."
npm install

echo "Starting app..."
npx expo start --clear --web

echo "Done. Your app should open in the browser."
