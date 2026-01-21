# Appwrite Storage Setup Guide

## Issue: Image Upload 500 Error

If you're seeing a `500 Internal Server Error` when uploading images, the most likely cause is that the **storage bucket doesn't exist** in your Appwrite project.

## Solution

### Option 1: Run the Setup Script (Recommended)

```bash
# Make sure you have the API key configured
node scripts/setupStorage.mjs
```

This script will:
- Check if the `thread-images` bucket exists
- Create it with proper permissions if it doesn't

### Option 2: Manual Setup via Appwrite Console

1. **Go to Appwrite Console**: https://cloud.appwrite.io/
2. **Select your project**: `696517c8000167cf1b8a`
3. **Navigate to Storage** in the left sidebar
4. **Click "Create Bucket"**
5. **Configure the bucket**:
   - **Bucket ID**: `thread-images` (IMPORTANT: must match exactly!)
   - **Bucket Name**: `Thread Images`
   - **Permissions**:
     - Create: `Any` or `Users`
     - Read: `Any` (so images can be viewed publicly)
     - Update: `Users`
     - Delete: `Users`
   - **Maximum File Size**: `5 MB` (or adjust as needed)
   - **Allowed File Extensions**: `jpg, jpeg, png, gif, webp`
   - **Enabled**: ✅ Yes
   - **Encryption**: ✅ Yes (recommended)

6. **Click "Create"**

## Required Environment Variables

Make sure these are set in your `.env.local` and on Vercel:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=696517c8000167cf1b8a
APPWRITE_API_KEY=<your-api-key>
```

## API Key Permissions

Your Appwrite API key must have these scopes:
- `buckets.read`
- `buckets.write` 
- `files.read`
- `files.write`

To check/update API key permissions:
1. Go to Appwrite Console → Your Project → Settings → API Keys
2. Click on your API key
3. Verify the Storage permissions are enabled

## Verifying the Fix

After creating the bucket:

1. **Check in Console**: Go to Storage → You should see `thread-images` bucket
2. **Test Upload**: 
   - Log into your app
   - Try creating a thread with an image
   - It should upload successfully

## Troubleshooting

### Error: "Storage bucket not found"
- The bucket `thread-images` doesn't exist. Create it following the steps above.

### Error: "The current user is not authorized"
- Check bucket permissions - `create` should allow users
- Verify your API key has storage permissions

### Error: "Invalid file type" or "File too large"
- Bucket is configured to only accept certain file types
- Check the allowed extensions and max file size in bucket settings

## Technical Details

The image upload flow:
1. Client sends image to `/api/upload/image`
2. Server validates session (user must be logged in)
3. Server validates file (size, type)
4. Server uploads to Appwrite Storage bucket `thread-images`
5. Returns `imageId` and `imageUrl` to client

The bucket ID is configured in [lib/appwriteConfig.ts](lib/appwriteConfig.ts):
```typescript
BUCKETS: {
  THREAD_IMAGES: 'thread-images',
}
```
