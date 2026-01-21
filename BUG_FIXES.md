# Bug Fixes Summary - Mobile & API Issues

## Issues Identified

### 1. Feed API 500 Error
**Problem:** Feed endpoint was failing with 500 error
**Root Cause:** Incorrect field name in query - using `$createdAt` instead of `createdAt`
**Fix:** Changed `Query.orderDesc('$createdAt')` to `Query.orderDesc('createdAt')` in [threadService.ts](lib/services/threadService.ts#L135)

### 2. Storage Bucket 400 Error  
**Problem:** Image upload failing with 400 error from storage API
**Root Cause:** Using client-side storage for uploads but credentials/permissions not properly configured
**Fixes:**
- Changed [imageService.ts](lib/services/imageService.ts) to use `serverStorage` instead of client `storage`
- Created new API endpoint [/api/upload/image](app/api/upload/image/route.ts) for server-side image uploads
- Updated [ThreadComposer.tsx](components/threads/ThreadComposer.tsx#L104) to upload via API with FormData instead of calling service directly

### 3. Mobile Network Access Issues
**Problem:** "Failed to fetch" errors when accessing from mobile device on network
**Root Cause:** Missing CORS headers for cross-origin requests
**Fixes:**
- Added CORS headers to [/api/feed](app/api/feed/route.ts) (GET + OPTIONS)
- Added CORS headers to [/api/threads](app/api/threads/route.ts) (POST + OPTIONS)
- Added CORS headers to [/api/auth/login](app/api/auth/login/route.ts) (POST + OPTIONS)  
- Added CORS headers to [/api/auth/register](app/api/auth/register/route.ts) (POST + OPTIONS)
- Added CORS headers to [/api/upload/image](app/api/upload/image/route.ts) (POST + OPTIONS)

### 4. Registration Redirect Failure on Mobile
**Problem:** After registration on mobile, user not redirected to feed page
**Root Cause:** Login function was calling AuthService.login (client-side SDK) instead of API route
**Fix:** Updated [useAuth.ts](hooks/useAuth.ts#L20) login function to call `/api/auth/login` API endpoint with credentials, increased timeout to 300ms for cookie setting

### 5. Null Attribute Values
**Problem:** Thread creation might fail with null values for optional fields
**Root Cause:** Appwrite requires empty strings for optional string attributes, not null
**Fix:** Changed null to empty strings in [threadService.ts](lib/services/threadService.ts#L88) for `imageId`, `imageUrl`, `altText`, `parentThreadId`

## Files Modified

### Backend Services
1. **lib/services/threadService.ts**
   - Fixed query field name (createdAt)
   - Changed null to empty strings for optional attributes

2. **lib/services/imageService.ts**
   - Changed to use serverStorage (node-appwrite)
   - Updated all storage methods: createFile, deleteFile, getFileView, getFilePreview

### API Routes
3. **app/api/feed/route.ts**
   - Added OPTIONS handler for CORS
   - Added CORS headers to GET response

4. **app/api/threads/route.ts**
   - Added OPTIONS handler for CORS

5. **app/api/auth/login/route.ts**
   - Added OPTIONS handler for CORS

6. **app/api/auth/register/route.ts**
   - Added OPTIONS handler for CORS

7. **app/api/upload/image/route.ts** ⭐ NEW
   - Server-side image upload endpoint
   - Session authentication required
   - File validation
   - Returns imageId and imageUrl

### Frontend Components
8. **components/threads/ThreadComposer.tsx**
   - Removed direct imageService import
   - Changed to upload via `/api/upload/image` API
   - Uses FormData for file upload

### Hooks
9. **hooks/useAuth.ts**
   - Changed login to call `/api/auth/login` instead of AuthService
   - Increased cookie settling timeout to 300ms
   - Added `credentials: 'include'` to fetch calls

## Testing Checklist

- [ ] **Feed Loading**: Navigate to /feed and verify threads load without 500 error
- [ ] **Thread Creation (Text Only)**: Create a text-only thread, should succeed
- [ ] **Thread Creation (With Image)**: Upload image with thread, should succeed without 400 error
- [ ] **Mobile Registration**: Register new account from mobile device, should redirect to /feed
- [ ] **Mobile Login**: Login from mobile device, should redirect to /feed  
- [ ] **Mobile Feed Access**: Access /feed from mobile device on network, should load
- [ ] **Image Display**: Created threads with images should display properly
- [ ] **Cross-Device Session**: Register on mobile, access on laptop (should work)

## Architecture Changes

### Before
```
ThreadComposer → imageService (client storage) ❌
Login/Register → AuthService (client SDK) ❌
```

### After  
```
ThreadComposer → /api/upload/image → imageService (server storage) ✅
Login/Register → /api/auth/* → Account API ✅
```

## Security Notes

- All image uploads now go through authenticated API endpoint
- Server-side storage ensures file permissions are enforced
- CORS headers are permissive (`*`) - consider restricting to specific domains in production
- Session cookies properly included with `credentials: 'include'`

## Next Steps

1. Test all endpoints from mobile device
2. Verify image uploads work end-to-end
3. Check that registration → login → redirect flow works
4. Monitor server logs for any remaining errors
5. Consider adding rate limiting to image upload endpoint
6. Consider restricting CORS to specific domains for production
