# 🧵 Threads Clone - Next.js + TypeScript + Appwrite

A production-ready Threads-like social application built with modern web technologies and SOLID principles.

## 🚀 Tech Stack

- **Frontend:** Next.js 16.1.1, React 19, TypeScript
- **Backend:** Appwrite (Cloud)
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **Architecture:** Mobile-First, SOLID Principles

## ✅ Current Status: Milestone 1 Setup Complete

- [x] Project initialization
- [x] Appwrite client/server configuration
- [x] Environment variable validation (Zod)
- [x] Security patterns implemented
- [x] Type-safe database schemas
- [x] Authentication service (SOLID pattern)
- [ ] Database collections setup (see [APPWRITE_SETUP.md](APPWRITE_SETUP.md))
- [ ] Authentication UI
- [ ] User profile page

## 📋 Milestones

1. **Auth + Profile** (Current) - Register, login, logout, editable profile
2. **Threads + Feed** - Create posts, public feed with pagination
3. **Replies** - Reply to posts, thread detail page
4. **Likes** - Like/unlike posts, display counts
5. **Follow System** - Follow/unfollow users, following feed
6. **Search + Polish** - User search, loading/error states

## 🏗️ Project Structure

```
threads-clone/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Homepage (connection test)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/
│   ├── appwriteClient.ts  # Browser-safe Appwrite client
│   ├── appwriteServer.ts  # Server-side Appwrite client (API key)
│   ├── appwriteConfig.ts  # Configuration & validation (Zod)
│   ├── utils.ts           # Common utilities
│   └── services/
│       └── authService.ts # Authentication service (SOLID)
├── types/
│   └── appwrite.ts        # TypeScript interfaces for models
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
└── public/               # Static assets
```

## 🔒 Security Features

- ✅ Environment variable validation (Zod)
- ✅ Client/server Appwrite separation (no API keys in browser)
- ✅ Input sanitization (XSS prevention)
- ✅ Email & password validation
- ✅ Rate limiting configuration
- ✅ User-friendly error messages
- ✅ Type-safe database operations

See [SECURITY_PATTERNS.md](SECURITY_PATTERNS.md) for details.

## 🛠️ Getting Started

### Quick Setup (3 Commands)

```bash
# 1. Install all dependencies
npm install class-variance-authority clsx tailwind-merge lucide-react react-hook-form @hookform/resolvers dotenv

# 2. Set up Appwrite database
npm run setup:db

# 3. Install shadcn/ui components
npx shadcn@latest add button input label card form avatar textarea toast separator

# 4. Start development server
npm run dev
```

### Detailed Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file (already exists):

```env
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
APPWRITE_API_KEY="your-api-key"
APPWRITE_DATABASE_ID="your-database-id"
```

### 3. Set Up Appwrite Database

Follow the complete guide in [APPWRITE_SETUP.md](APPWRITE_SETUP.md) to:

- Create 4 collections (users, threads, likes, follows)
- Configure attributes and indexes
- Set up permissions

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you should see:
✅ **"Connected to Appwrite! No user logged in yet."**

## 📐 SOLID Principles Applied

### Single Responsibility Principle (SRP)

- Each file has one clear purpose
- Services handle only their domain logic
- Configuration separated from implementation

### Dependency Inversion Principle (DIP)

- Services depend on Appwrite SDK abstractions
- Easy to mock for testing
- Can swap backends with minimal changes

### Open/Closed Principle (OCP)

- Configuration objects are extensible
- New features don't require modifying existing code

## 🎯 Design Decisions

### Why Zod for Validation?

- Type-safe environment variables
- Runtime validation catches config errors early
- Better error messages than manual checks

### Why Separate Client/Server Appwrite Instances?

- Security: API keys never exposed to browser
- Performance: Server client can use admin operations
- Best practice: Follows Appwrite documentation

### Why Service Classes?

- Encapsulation: All auth logic in one place
- Testability: Easy to mock services
- Reusability: Use same service across components

## 📱 Mobile-First Architecture

- Responsive design from the start
- Touch-optimized interactions
- Progressive enhancement for desktop

## 🚨 What We're NOT Building (Scope Control)

❌ Real-time updates (WebSockets)
❌ Dark mode (scope creep)
❌ Push notifications
❌ Offline mode
❌ Video posts
❌ Direct messaging

**Focus:** Core features, clean code, production patterns

## 🧪 Testing the Setup

```bash
# Start dev server
npm run dev

# Visit http://localhost:3000
# Should see: "✅ Connected to Appwrite!"
```

## 📚 Documentation

- [APPWRITE_SETUP.md](APPWRITE_SETUP.md) - Complete database setup guide
- [SECURITY_PATTERNS.md](SECURITY_PATTERNS.md) - Security implementation details
- [lib/appwriteConfig.ts](lib/appwriteConfig.ts) - Configuration constants
- [types/appwrite.ts](types/appwrite.ts) - Data models

## 🎓 For Mentor Review

**Key Talking Points:**

1. Environment validation prevents runtime config errors
2. Client/server separation enhances security
3. Input sanitization prevents XSS attacks
4. SOLID principles make code maintainable
5. Type-safe models catch bugs at compile time
6. Centralized configuration simplifies updates

## 📝 Next Steps

1. ✅ Complete Appwrite database setup
2. ✅ Build authentication UI (login/register)
3. ✅ Implement user profile page
4. ✅ Add profile editing
5. ⏭️ Move to Milestone 2 (Threads + Feed)

## 🤝 Contributing

This is an internship project. Code reviews and suggestions welcome!

## 📄 License

MIT
