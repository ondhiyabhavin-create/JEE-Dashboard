# AWS Lambda Deployment - Summary

## Files Created/Modified

### New Files:
1. **`lambda.js`** - Main Lambda handler for API Gateway
2. **`lambda-cron.js`** - Lambda handler for scheduled visit notifications (runs every 15 minutes)
3. **`serverless.yml`** - Serverless Framework configuration
4. **`.serverlessignore`** - Files to exclude from deployment
5. **`DEPLOYMENT.md`** - Detailed deployment guide
6. **`QUICK_START.md`** - Quick start guide

### Modified Files:
1. **`package.json`** - Added serverless dependencies and scripts

## Key Features

✅ **Serverless HTTP Handler** - Express app wrapped with serverless-http  
✅ **Database Connection Pooling** - Reuses MongoDB connections across invocations  
✅ **Cold Start Optimization** - Initializes DB on first request  
✅ **Scheduled Tasks** - Visit notifications via EventBridge (every 15 minutes)  
✅ **Environment Variables** - All config via environment variables  
✅ **CORS Support** - Configured for API Gateway  
✅ **File Upload Support** - Binary content types configured  

## Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AWS:**
   ```bash
   aws configure
   ```

3. **Set environment variables:**
   ```bash
   export MONGODB_URI="your-mongodb-uri"
   export JWT_SECRET="your-secret"
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

## Architecture

```
API Gateway → Lambda (api) → Express App → MongoDB
                    ↓
            EventBridge (every 15 min)
                    ↓
            Lambda (visitNotifications) → MongoDB → WhatsApp
```

## Important Notes

- **Cold Starts**: First request may take 1-3 seconds
- **Database**: MongoDB Atlas must allow connections from Lambda IPs (0.0.0.0/0)
- **Cron Jobs**: Visit notifications run every 15 minutes automatically
- **Memory**: Default 512MB (adjustable in serverless.yml)
- **Timeout**: Default 30s for API, 60s for cron (adjustable)

## Next Steps

1. Deploy using the steps above
2. Get your API Gateway URL from deployment output
3. Update frontend `lib/api.ts` with the new URL
4. Test the deployment
5. Monitor via CloudWatch Logs

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md) or [QUICK_START.md](./QUICK_START.md)

