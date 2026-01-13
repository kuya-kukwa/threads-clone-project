# 📁 PROJECT STRUCTURE - Threads Clone

## Current Structure (After Setup)

```
threads-clone/
│
├── 📱 app/                          # Next.js App Router
│   ├── page.tsx                     # ✅ Homepage (connection test)
│   ├── layout.tsx                   # ✅ Root layout
│   └── globals.css                  # ✅ Global styles (shadcn)
│
├── 🧩 components/                   # React Components
│   └── ui/                          # 🎨 shadcn/ui components (auto-generated)
│       ├── button.tsx               # After: npx shadcn add button
│       ├── input.tsx                # After: npx shadcn add input
│       ├── card.tsx                 # After: npx shadcn add card
│       └── ...                      # Other shadcn components
│
├── 🪝 hooks/                        # Custom React Hooks
│   └── (empty - you'll add later)
│
├── 🔧 lib/                          # Utility Libraries
│   ├── appwriteClient.ts            # ✅ Browser-safe Appwrite client
│   ├── appwriteServer.ts            # ✅ Server-only Appwrite client
│   ├── appwriteConfig.ts            # ✅ Config + Zod validation
│   ├── utils.ts                     # ✅ Utility functions (cn, formatDate, etc.)
│   └── services/
│       └── authService.ts           # ✅ Authentication service (SOLID)
│
├── 🗄️ types/                        # TypeScript Definitions
│   └── appwrite.ts                  # ✅ Database model interfaces
│
├── 🎨 public/                       # Static Assets
│   └── (images, icons, etc.)
│
├── 📜 scripts/                      # Utility Scripts
│   ├── setupDatabase.mjs            # ✅ Database setup automation
│   ├── install-deps.ps1             # ✅ Dependency installer (Windows)
│   └── install-deps.sh              # ✅ Dependency installer (Unix)
│
├── 📝 Configuration Files
│   ├── .env                         # ✅ Environment variables
│   ├── .gitignore                   # ✅ Git ignore rules
│   ├── components.json              # ✅ shadcn/ui configuration
│   ├── tsconfig.json                # ✅ TypeScript config
│   ├── next.config.ts               # ✅ Next.js config
│   ├── package.json                 # ✅ Dependencies + scripts
│   └── eslint.config.mjs            # ✅ ESLint config
│
└── 📚 Documentation
    ├── README.md                    # ✅ Project overview
    ├── APPWRITE_SETUP.md            # ✅ Database setup guide
    ├── SECURITY_PATTERNS.md         # ✅ Security documentation
    ├── MILESTONE_1_SETUP.md         # ✅ M1 setup instructions
    └── COMMANDS.md                  # ✅ Quick command reference
```

---

## 🎯 Milestone 1: Structure to Build

```
threads-clone/
│
├── app/
│   ├── (auth)/                      # 🔒 Auth route group
│   │   ├── layout.tsx               # Auth layout (centered, clean)
│   │   ├── login/
│   │   │   └── page.tsx             # Login page
│   │   └── register/
│   │       └── page.tsx             # Register page
│   │
│   ├── profile/
│   │   └── [id]/
│   │       └── page.tsx             # Dynamic user profile page
│   │
│   └── feed/
│       └── page.tsx                 # Main feed (redirect after login)
│
├── components/
│   ├── auth/                        # 🔐 Authentication Components
│   │   ├── LoginForm.tsx            # Login form with validation
│   │   ├── RegisterForm.tsx         # Register form with validation
│   │   └── LogoutButton.tsx         # Logout button
│   │
│   ├── profile/                     # 👤 Profile Components
│   │   ├── ProfileCard.tsx          # Profile display card
│   │   ├── EditProfileForm.tsx      # Edit profile form
│   │   └── ProfileHeader.tsx        # Profile header with avatar
│   │
│   └── layout/                      # 🧭 Layout Components
│       ├── NavBar.tsx               # Navigation bar
│       └── ProtectedRoute.tsx       # Auth guard wrapper
│
├── hooks/                           # 🪝 Custom Hooks
│   ├── useAuth.ts                   # Auth state management
│   └── useProfile.ts                # Profile data fetching
│
└── lib/
    └── services/
        ├── authService.ts           # ✅ Already created
        └── profileService.ts        # Profile CRUD operations
```

---

## 🗂️ Appwrite Database Structure

```
📊 Database: threadclonedb (69651a84002e63ff2c97)
│
├── 👥 users
│   ├── userId (string, 255)
│   ├── username (string, 30) [unique]
│   ├── displayName (string, 50)
│   ├── bio (string, 160)
│   ├── avatarUrl (string, 500)
│   ├── createdAt (string, 255)
│   └── updatedAt (string, 255)
│
├── 💬 threads
│   ├── authorId (string, 255)
│   ├── content (string, 500)
│   ├── imageUrl (string, 500)
│   ├── parentThreadId (string, 255)
│   ├── replyCount (integer)
│   ├── likeCount (integer)
│   └── createdAt (string, 255)
│
├── ❤️ likes
│   ├── userId (string, 255)
│   ├── threadId (string, 255)
│   └── createdAt (string, 255)
│
└── 🔗 follows
    ├── followerId (string, 255)
    ├── followingId (string, 255)
    └── createdAt (string, 255)
```

---

## 🎨 Component Hierarchy (Milestone 1)

```
App
├── Layout (Root)
│   ├── NavBar
│   │   └── LogoutButton (if authenticated)
│   │
│   └── Pages
│       ├── Login Page
│       │   └── LoginForm
│       │       ├── Input (email)
│       │       ├── Input (password)
│       │       └── Button (submit)
│       │
│       ├── Register Page
│       │   └── RegisterForm
│       │       ├── Input (email)
│       │       ├── Input (password)
│       │       ├── Input (username)
│       │       ├── Input (displayName)
│       │       └── Button (submit)
│       │
│       └── Profile Page
│           ├── ProfileCard
│           │   ├── Avatar
│           │   ├── DisplayName
│           │   ├── Username
│           │   └── Bio
│           │
│           └── EditProfileForm (if own profile)
│               ├── Input (displayName)
│               ├── Textarea (bio)
│               ├── Input (avatar URL)
│               └── Button (save)
```

---

## 🔐 Authentication Flow

```
1. User visits /login
   ↓
2. Enters email/password
   ↓
3. LoginForm validates input
   ↓
4. Calls authService.login()
   ↓
5. Appwrite creates session
   ↓
6. Redirect to /feed
   ↓
7. NavBar shows LogoutButton
```

---

## 📊 Data Flow (SOLID Architecture)

```
UI Component
    ↓ (calls)
Service Layer (authService.ts)
    ↓ (uses)
Appwrite Client (appwriteClient.ts)
    ↓ (communicates with)
Appwrite Cloud (fra.cloud.appwrite.io)
    ↓ (stores in)
Database Collection (users, threads, etc.)
```

---

## 🎯 Implementation Order

### Phase 1: Authentication UI

1. Create `app/(auth)/layout.tsx`
2. Create `components/auth/LoginForm.tsx`
3. Create `app/(auth)/login/page.tsx`
4. Test login flow

### Phase 2: Registration

5. Create `components/auth/RegisterForm.tsx`
6. Create `app/(auth)/register/page.tsx`
7. Test registration flow

### Phase 3: Profile Display

8. Create `components/profile/ProfileCard.tsx`
9. Create `app/profile/[id]/page.tsx`
10. Test profile viewing

### Phase 4: Profile Editing

11. Create `components/profile/EditProfileForm.tsx`
12. Add profile service for updates
13. Test profile editing

### Phase 5: Navigation

14. Create `components/layout/NavBar.tsx`
15. Add logout functionality
16. Add protected routes

---

**Current Status:** ✅ Foundation Complete → Ready to Build UI!

**Next File to Create:** `components/auth/LoginForm.tsx`
