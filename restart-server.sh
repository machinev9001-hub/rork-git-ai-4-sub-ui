#!/bin/bash

echo "Killing any running Metro/Expo processes..."
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "node.*expo" || true

echo "Waiting for processes to stop..."
sleep 2

echo "Clearing Expo cache..."
npx expo start -c --web
