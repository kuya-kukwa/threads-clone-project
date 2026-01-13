# 🚀 Milestone 1: Complete Setup Guide

## ✅ What's Already Done

- [x] Appwrite client/server configuration
- [x] Environment variable validation (Zod)
- [x] Security patterns implemented
- [x] Type definitions for database models
- [x] Authentication service (AuthService)
- [x] shadcn/ui configuration files
- [x] Database setup script created

## 📦 Step 1: Install Dependencies

Run these commands:

```bash
# Core dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react

# Form handling
npm install react-hook-form @hookform/resolvers

# Additional utilities
npm install dotenv
```

## 🗄️ Step 2: Set Up Database Collections

Run the automated setup script:

```bash
npm run setup:db
```

This creates 4 collections automatically:

- ✅ **users** - User profiles (7 attributes, 2 indexes)
- ✅ **threads** - Posts & replies (7 attributes, 3 indexes)
- ✅ **likes** - Like records (3 attributes, 2 indexes)
- ✅ **follows** - Follow relationships (3 attributes, 3 indexes)

**Expected Output:**

```
🚀 Starting Appwrite Database Setup...
📦 Creating collection: Users (users)
   ✓ Collection created
   ✓ Created attribute: userId
   ✓ Created attribute: username
   ...
✅ Collection Users setup complete!
🎉 Database setup complete!
```

## 🎨 Step 3: Install shadcn/ui Components

Run these commands one at a time:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add form
npx shadcn@latest add avatar
npx shadcn@latest add textarea
npx shadcn@latest add toast
npx shadcn@latest add separator
```

Components will be added to `components/ui/` directory.

## ✅ Step 4: Verify Setup

### 1. Check Files Created

- [x] `components.json` in root
- [x] `lib/utils.ts` has `cn()` function
- [x] `app/globals.css` has shadcn CSS variables
- [x] `scripts/setupDatabase.mjs` exists
- [ ] `components/ui/` folder has components (after Step 3)

### 2. Test Appwrite Connection

```bash
npm run dev
```

Visit http://localhost:3000 → Should see: **"✅ Connected to Appwrite!"**

### 3. Verify Database Collections

1. Go to https://cloud.appwrite.io
2. Navigate to your database (`threadclonedb`)
3. Check all 4 collections exist with attributes and indexes

## 🏗️ Step 5: Build Milestone 1 Features

Now create the authentication UI:

### File Structure to Create:

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── register/
│   │   └── page.tsx          # Register page
│   └── layout.tsx            # Auth layout
├── profile/
│   └── [id]/
│       └── page.tsx          # User profile page
components/
├── auth/
│   ├── LoginForm.tsx         # Login form with validation
│   ├── RegisterForm.tsx      # Register form with validation
│   └── LogoutButton.tsx      # Logout button
├── profile/
│   ├── ProfileCard.tsx       # Profile display
│   └── EditProfileForm.tsx   # Edit profile form
└── layout/
    └── NavBar.tsx            # Navigation bar
```

## 📝 Milestone 1 Checklist

### Authentication

- [ ] Login page with email/password
- [ ] Register page with validation
- [ ] Logout functionality
- [ ] Protected routes (redirect if not logged in)
- [ ] Error messages for failed auth

### Profile

- [ ] View user profile
- [ ] Display: avatar, username, display name, bio
- [ ] Edit profile button (own profile only)
- [ ] Edit profile form with validation
- [ ] Avatar upload (optional for M1)

### UI Polish (from requirements)

- [ ] Inputs have labels (not just placeholders)
- [ ] Buttons disable while submitting
- [ ] Errors shown inline (not alerts)
- [ ] Avatar preview when editing profile
- [ ] Profile info stacked cleanly

### UX Must-Haves

- [ ] Login → redirect to feed
- [ ] Logout → redirect to login
- [ ] Save profile → instant feedback

## 🎯 Best Practices Applied

### 1. **SOLID Principles**

- Single Responsibility: Each service/component has one job
- Dependency Inversion: Services use Appwrite abstractions
- Open/Closed: Configuration is extensible

### 2. **Security**

- Input sanitization (XSS prevention)
- Email/password validation
- Client/server separation (no API keys in browser)
- Rate limiting configuration ready

### 3. **Type Safety**

- TypeScript interfaces for all models
- Zod validation for environment variables
- Strongly typed service methods

### 4. **Mobile-First**

- Responsive design from the start
- Touch-optimized interactions
- Test on 375px viewport

## 🐛 Troubleshooting

### Database Setup Fails?

```bash
# Check environment variables
cat .env

# Verify you have the right permissions
# API key must have Database permissions in Appwrite Console
```

### shadcn Components Not Installing?

```bash
# Make sure components.json exists
ls components.json

# Check dependencies are installed
npm list class-variance-authority clsx tailwind-merge
```

### TypeScript Errors with cn() function?

```bash
# Make sure you installed the dependencies
npm install class-variance-authority clsx tailwind-merge
```

### Connection Test Fails?

1. Check `.env` has all variables (no spaces around `=`)
2. Restart dev server
3. Clear `.next` cache: `rm -rf .next` or `Remove-Item -Recurse -Force .next`

## 📚 Next Steps After Setup

1. **Create Login Page** - Start with authentication UI
2. **Build Register Flow** - User registration with validation
3. **Profile Display** - Show user information
4. **Edit Profile** - Allow users to update their info
5. **Navigation** - Add navbar with logout

## 🎓 For Mentor Review

**What You Can Explain:**

1. **"I used Zod for runtime validation of environment variables"**

   - Catches config errors immediately on startup
   - Type-safe access to env vars

2. **"Client/server Appwrite separation prevents API key exposure"**

   - `appwriteClient.ts` → browser-safe
   - `appwriteServer.ts` → server-only with API key

3. **"Input sanitization prevents XSS attacks"**

   - Strips HTML tags from user input
   - Validates formats (email, username patterns)

4. **"SOLID principles make the code maintainable"**

   - AuthService has single responsibility
   - Easy to test and extend

5. **"Mobile-first approach from the start"**
   - Design for 375px viewport first
   - Progressive enhancement for desktop

---

**Ready to code!** 🚀

Run `npm run dev` and start building the authentication UI.
