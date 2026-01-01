# AWS Lambda Deployment Guide

This guide will help you deploy the JEE Dashboard backend to AWS Lambda using Serverless Framework.

## Prerequisites

1. AWS Account
2. AWS CLI installed and configured
3. Node.js 18.x or higher
4. Serverless Framework CLI

## Installation

1. Install AWS CLI (if not already installed):
```bash
# macOS
brew install awscli

# Or download from: https://aws.amazon.com/cli/
```

2. Install Serverless Framework globally:
```bash
npm install -g serverless
```

3. Install project dependencies:
```bash
cd backend
npm install
```

## AWS Configuration

### 1. Configure AWS Credentials

You can configure AWS credentials in two ways:

#### Option A: Using AWS CLI (Recommended)
```bash
aws configure
```

You'll be prompted for:
- AWS Access Key ID: [Your access key]
- AWS Secret Access Key: [Your secret key]
- Default region name: us-east-1 (or your preferred region)
- Default output format: json

#### Option B: Using Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here
export AWS_DEFAULT_REGION=us-east-1
```

### 2. Set Environment Variables

Create a `.env` file in the backend directory or set environment variables:

```bash
# Required
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/jee-dashboard"
export JWT_SECRET="your-secret-key-here"

# Optional - WhatsApp Configuration
export WHATSAPP_ENABLED="true"
export WHATSAPP_PROVIDER="twilio"
export TWILIO_ACCOUNT_SID="your-account-sid"
export TWILIO_AUTH_TOKEN="your-auth-token"
export WHATSAPP_FROM_NUMBER="whatsapp:+1234567890"
```

## Deployment

### Deploy to Development (Default)

```bash
cd backend

# Set environment variables
export MONGODB_URI="your-mongodb-uri"
export JWT_SECRET="your-jwt-secret"

# Deploy
npm run deploy
```

### Deploy to Production

```bash
export MONGODB_URI="your-mongodb-uri"
export JWT_SECRET="your-jwt-secret"
export WHATSAPP_ENABLED="true"
export TWILIO_ACCOUNT_SID="your-sid"
export TWILIO_AUTH_TOKEN="your-token"
export WHATSAPP_FROM_NUMBER="your-number"

npm run deploy:prod
```

### Deploy with Custom Region

```bash
serverless deploy --region us-west-2 --stage prod
```

## Post-Deployment

After deployment, you'll receive an API Gateway endpoint URL. It will look like:
```
https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
```

### Update Frontend API URL

Update your frontend `lib/api.ts` to use the Lambda endpoint:

```typescript
const API_URL = 'https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/api';
```

## Monitoring

### View Logs

```bash
# View all logs
serverless logs -f api

# Tail logs (real-time)
serverless logs -f api --tail

# View cron function logs
serverless logs -f visitNotifications --tail
```

### View Function Info

```bash
serverless info
```

## Removing Deployment

To remove all AWS resources:

```bash
npm run remove
```

Or:

```bash
serverless remove
```

## Local Testing

Test Lambda functions locally:

```bash
npm run offline
```

This will start a local server at `http://localhost:3000`

## Important Notes

1. **Cold Starts**: Lambda functions may experience cold starts (1-3 seconds) on first invocation after inactivity. This is normal.

2. **Database Connections**: The Lambda handler uses connection pooling to reuse MongoDB connections across invocations.

3. **Cron Jobs**: Visit notifications run every 15 minutes via EventBridge. Make sure the `visitNotifications` function is deployed.

4. **File Uploads**: For file uploads (Excel files), ensure your Lambda has sufficient memory (512MB default) and timeout (30s default).

5. **Environment Variables**: All sensitive data should be set as environment variables, not hardcoded.

6. **CORS**: CORS is configured to allow all origins. For production, consider restricting this.

## Troubleshooting

### Deployment Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify IAM permissions
3. Check CloudFormation stack: `aws cloudformation list-stacks`

### Function Timeout

Increase timeout in `serverless.yml`:
```yaml
timeout: 60  # seconds
```

### Out of Memory

Increase memory in `serverless.yml`:
```yaml
memorySize: 1024  # MB
```

### Database Connection Issues

1. Verify MongoDB URI is correct
2. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for Lambda)
3. Verify database user permissions

## Cost Optimization

- Use provisioned concurrency for production (reduces cold starts)
- Set appropriate memory sizes (start with 512MB)
- Monitor and optimize function execution time
- Use CloudWatch alarms for cost monitoring

## Support

For issues, check:
- AWS CloudWatch Logs
- Serverless Framework documentation: https://www.serverless.com/framework/docs
- AWS Lambda documentation: https://docs.aws.amazon.com/lambda/

