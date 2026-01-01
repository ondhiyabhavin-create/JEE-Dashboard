# Vercel Environment Variables Setup

## Required Environment Variable

Add this environment variable in your Vercel project settings:

### Variable Name:
```
NEXT_PUBLIC_API_URL
```

### Variable Value:
```
https://qr9vevhu9j.execute-api.us-east-1.amazonaws.com/dev/api
```

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://qr9vevhu9j.execute-api.us-east-1.amazonaws.com/dev/api`
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

## Alternative: Update via Vercel CLI

```bash
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://qr9vevhu9j.execute-api.us-east-1.amazonaws.com/dev/api
# Select: Production, Preview, Development
```

Then redeploy:
```bash
vercel --prod
```

## Verification

After setting the environment variable and redeploying, check the browser console. You should see:
```
🔗 API URL: https://qr9vevhu9j.execute-api.us-east-1.amazonaws.com/dev/api
```

## Fallback Behavior

If `NEXT_PUBLIC_API_URL` is not set:
- **Local development** (localhost): Uses `http://localhost:5001/api`
- **Production**: Uses the Lambda URL automatically

