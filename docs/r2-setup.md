# Cloudflare R2 Setup Guide

## 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account → R2
3. Click "Create bucket"
4. Name: `3d-ultra` (or your preferred name)
5. Location: Auto (or choose nearest region)

## 2. Create API Token

1. Go to R2 → Manage R2 API Tokens
2. Click "Create API token"
3. Token name: `3d-ultra-api`
4. Permissions: **Object Read & Write**
5. Specify bucket: `3d-ultra`
6. TTL: No expiration (or set as needed)
7. Click "Create API Token"
8. **Save the credentials immediately** - they won't be shown again:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`

## 3. Get Account ID

Your Account ID is in the URL when viewing R2:

```
https://dash.cloudflare.com/{ACCOUNT_ID}/r2/...
```

Or find it in: Account Home → Account ID (right sidebar)

## 4. Configure CORS

1. Go to R2 → Your bucket → Settings
2. Scroll to "CORS Policy"
3. Click "Edit CORS Policy"
4. Paste this configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://3d-ultra.com",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

5. Click "Save"

## 5. Environment Variables

Add these to your `.env` file:

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="3d-ultra"
```

## 6. Test the Setup

### Generate Upload URL

```bash
curl -X POST http://localhost:3000/api/storage/upload-url \
  -H "Content-Type: application/json" \
  -d '{"key": "test/hello.txt", "contentType": "text/plain"}'
```

### Upload a File

```bash
# Use the URL from the previous response
curl -X PUT "PRESIGNED_URL_HERE" \
  -H "Content-Type: text/plain" \
  -d "Hello, R2!"
```

### Generate Download URL

```bash
curl http://localhost:3000/api/storage/download-url/test/hello.txt
```

## File Structure

The app will store files in this structure:

```
/uploads/{uploadId}/original.jpg    # Original ultrasound
/results/{resultId}/full.jpg        # Full resolution result
/results/{resultId}/preview.jpg     # Watermarked preview
```

## URL Expiration

- **Upload URLs**: 15 minutes (security)
- **Preview URLs**: 15 minutes (until payment)
- **Download URLs**: 7 days (after purchase)

## Troubleshooting

### "Storage service not configured"

- Check that all R2\_\* environment variables are set
- Restart the server after adding env vars

### "CORS error when uploading"

- Verify CORS policy includes your origin
- Check browser console for specific CORS error

### "Access Denied"

- Verify API token has Object Read & Write permissions
- Check the token is scoped to the correct bucket
