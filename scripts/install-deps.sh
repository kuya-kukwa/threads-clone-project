#!/bin/bash

# Milestone 1 Setup Script
# Run this to install all dependencies at once

echo "🚀 Installing Milestone 1 Dependencies..."

# shadcn/ui core dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react

# Form handling
npm install react-hook-form @hookform/resolvers

# Additional utilities
npm install dotenv

echo "✅ Dependencies installed!"
echo ""
echo "📦 Next steps:"
echo "1. Run: npm run setup:db"
echo "2. Run: npx shadcn@latest add button input label card form avatar textarea toast separator"
echo "3. Run: npm run dev"
