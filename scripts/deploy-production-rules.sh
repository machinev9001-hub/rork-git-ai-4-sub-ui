#!/bin/bash

# Firebase Production Rules Deployment Script

set -e

echo "🚀 Firebase Production Rules Deployment"
echo "========================================"
echo ""

# Confirmation
read -p "⚠️  This will deploy NEW security rules to PRODUCTION. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""

# Check Firebase login
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase"
    echo "Run: firebase login"
    exit 1
fi

echo "✅ Firebase authenticated"
echo ""

# Backup current rules
echo "💾 Backing up current rules..."
if [ -f "firestore.rules" ]; then
    cp firestore.rules firestore.rules.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
else
    echo "⚠️  No existing rules to backup"
fi

echo ""

# Copy production rules
echo "📝 Copying production rules..."
cp firestore-production.rules firestore.rules
echo "✅ Production rules ready"

echo ""

# Deploy
echo "🚀 Deploying to Firebase..."
firebase deploy --only firestore:rules

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Go to Firebase Console → Firestore → Rules"
echo "  2. Verify the rules are active"
echo "  3. Test your app thoroughly"
echo "  4. Monitor for permission errors"
echo ""
echo "🔄 Rollback command (if needed):"
echo "  cp firestore.rules.backup.[timestamp] firestore.rules"
echo "  firebase deploy --only firestore:rules"
