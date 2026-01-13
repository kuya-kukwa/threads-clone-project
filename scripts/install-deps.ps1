# Milestone 1 Setup - Windows PowerShell Script
# Run this to install all dependencies at once

Write-Host "🚀 Installing Milestone 1 Dependencies..." -ForegroundColor Green

# shadcn/ui core dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react

# Form handling  
npm install react-hook-form @hookform/resolvers

# Additional utilities
npm install dotenv

Write-Host "✅ Dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run setup:db"
Write-Host "2. Run: npx shadcn@latest add button input label card form avatar textarea toast separator"
Write-Host "3. Run: npm run dev"
