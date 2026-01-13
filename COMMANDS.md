# 🎯 QUICK COMMAND REFERENCE

## 🚀 Initial Setup (Run Once)

```bash
# Install all dependencies at once
npm install class-variance-authority clsx tailwind-merge lucide-react react-hook-form @hookform/resolvers dotenv

# Set up Appwrite database collections
npm run setup:db

# Install shadcn/ui components (one command)
npx shadcn@latest add button input label card form avatar textarea toast separator
```

## 🔄 Daily Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## 📦 Adding More shadcn Components Later

```bash
# Dialog/Modal
npx shadcn@latest add dialog

# Dropdown menu
npx shadcn@latest add dropdown-menu

# Tabs
npx shadcn@latest add tabs

# Skeleton loader
npx shadcn@latest add skeleton

# Badge
npx shadcn@latest add badge

# All available: https://ui.shadcn.com/docs/components
```

## 🗄️ Database Management

```bash
# Re-run database setup (safe, skips existing)
npm run setup:db

# Manual setup (if script fails)
# Follow: APPWRITE_SETUP.md
```

## 🧹 Troubleshooting

```bash
# Clear Next.js cache
Remove-Item -Recurse -Force .next  # PowerShell
rm -rf .next                        # Bash

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules  # PowerShell
rm -rf node_modules                        # Bash
npm install

# Check installed packages
npm list class-variance-authority
npm list react-hook-form
```

## 📝 Git Workflow

```bash
# Check status
git status

# Stage changes
git add .

# Commit with message
git commit -m "feat: implement login functionality"

# Push to remote
git push origin main
```

## 🎓 Milestone 1 Feature Commands

Once dependencies are installed, you'll create:

```bash
# These are files you'll create manually (not commands)
app/(auth)/login/page.tsx
app/(auth)/register/page.tsx
app/profile/[id]/page.tsx
components/auth/LoginForm.tsx
components/auth/RegisterForm.tsx
components/profile/ProfileCard.tsx
```

## 💡 Pro Tips

1. **Always run `npm run dev` after making file changes**
2. **Test on mobile viewport (F12 → Responsive Mode → 375px)**
3. **Check Appwrite Console to verify data after operations**
4. **Use browser DevTools Console to debug errors**
5. **Restart dev server if you see weird errors**

## 🔗 Important Links

- Appwrite Console: https://cloud.appwrite.io
- shadcn/ui Docs: https://ui.shadcn.com
- Next.js Docs: https://nextjs.org/docs
- React Hook Form: https://react-hook-form.com

---

**Current Status:** ✅ Setup Complete → Ready to Build Auth UI!
