# 🎯 APPWRITE DATABASE SETUP GUIDE

## ✅ Step 1: Access Appwrite Console

1. Go to [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Navigate to your project: **thread-clone** (ID: `696517c8000167cf1b8a`)
3. Click on **Databases** in the left sidebar
4. Select your database: **threadclonedb** (ID: `69651a84002e63ff2c97`)

---

## 📋 Step 2: Create Collections

You need to create **4 collections** with the following configurations:

### 🟦 Collection 1: `users`

**Collection ID:** `users` (type this exactly)

**Attributes:**

1. `userId` - String, size: 255, required: ✅
2. `username` - String, size: 30, required: ✅
3. `displayName` - String, size: 50, required: ✅
4. `bio` - String, size: 160, required: ❌
5. `avatarUrl` - String, size: 500, required: ❌
6. `createdAt` - String (datetime), size: 255, required: ✅
7. `updatedAt` - String (datetime), size: 255, required: ✅

**Indexes:**

- `userId_index` - Key, Attribute: userId, Order: ASC
- `username_index` - Unique, Attribute: username, Order: ASC

**Permissions:**

- Create: Role: Users
- Read: Role: Any
- Update: Role: Users (document owner only via rules)
- Delete: Role: Users (document owner only via rules)

---

### 🟩 Collection 2: `threads`

**Collection ID:** `threads` (type this exactly)

**Attributes:**

1. `authorId` - String, size: 255, required: ✅
2. `content` - String, size: 500, required: ✅
3. `imageUrl` - String, size: 500, required: ❌
4. `parentThreadId` - String, size: 255, required: ❌
5. `replyCount` - Integer, required: ❌, default: 0
6. `likeCount` - Integer, required: ❌, default: 0
7. `createdAt` - String (datetime), size: 255, required: ✅

**Indexes:**

- `authorId_index` - Key, Attribute: authorId, Order: DESC
- `createdAt_index` - Key, Attribute: createdAt, Order: DESC
- `parentThreadId_index` - Key, Attribute: parentThreadId, Order: ASC

**Permissions:**

- Create: Role: Users
- Read: Role: Any
- Update: Role: Users (document owner only)
- Delete: Role: Users (document owner only)

---

### 🟨 Collection 3: `likes`

**Collection ID:** `likes` (type this exactly)

**Attributes:**

1. `userId` - String, size: 255, required: ✅
2. `threadId` - String, size: 255, required: ✅
3. `createdAt` - String (datetime), size: 255, required: ✅

**Indexes:**

- `userId_threadId_index` - Unique, Attributes: userId + threadId, Order: ASC
- `threadId_index` - Key, Attribute: threadId, Order: ASC

**Permissions:**

- Create: Role: Users
- Read: Role: Any
- Update: Role: Users (document owner only)
- Delete: Role: Users (document owner only)

---

### 🟪 Collection 4: `follows`

**Collection ID:** `follows` (type this exactly)

**Attributes:**

1. `followerId` - String, size: 255, required: ✅
2. `followingId` - String, size: 255, required: ✅
3. `createdAt` - String (datetime), size: 255, required: ✅

**Indexes:**

- `follower_following_index` - Unique, Attributes: followerId + followingId, Order: ASC
- `followerId_index` - Key, Attribute: followerId, Order: ASC
- `followingId_index` - Key, Attribute: followingId, Order: ASC

**Permissions:**

- Create: Role: Users
- Read: Role: Any
- Update: Role: Users (document owner only)
- Delete: Role: Users (document owner only)

---

## 🔐 Step 3: Configure Permissions (IMPORTANT)

For each collection, set permissions to:

### Document Security Rules:

In Appwrite Console → Database → Collection → Settings → Permissions:

1. **Any** role can **read** (public feed)
2. **Users** role can **create** (authenticated users only)
3. **Users** role can **update/delete** their own documents only

To restrict update/delete to document owners:

- In each collection settings, enable **Document Security**
- The authService will handle userId matching

---

## 🧪 Step 4: Test Your Setup

Run the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

You should see:
✅ **"Connected to Appwrite! No user logged in yet."**

If you see ❌ errors:

- Check your `.env` file has correct values
- Verify collection IDs match exactly: `users`, `threads`, `likes`, `follows`
- Ensure Database ID in `.env` matches Appwrite console

---

## 📝 Quick Checklist

- [ ] All 4 collections created with exact IDs
- [ ] All attributes added with correct types and sizes
- [ ] All indexes created for performance
- [ ] Permissions set correctly
- [ ] Test page shows "Connected to Appwrite"
- [ ] No console errors in browser

---

## 🚀 Next Steps (Milestone 1)

After database setup is complete:

1. ✅ Build login/register UI components
2. ✅ Implement authentication flow
3. ✅ Create user profile page
4. ✅ Add profile editing functionality

Your Appwrite setup is now complete and follows SOLID principles with:

- ✅ Zod validation for environment variables
- ✅ Separation of client/server Appwrite clients
- ✅ Type-safe database schemas
- ✅ Input sanitization and validation
- ✅ Security configuration constants
