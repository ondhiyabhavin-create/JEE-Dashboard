# Quick Start - AWS Lambda Deployment

## 1. Install Dependencies

```bash
cd backend
npm install
```

## 2. Install Serverless Framework

```bash
npm install -g serverless
```

## 3. Configure AWS Credentials

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., us-east-1)
- Default output format (json)

## 4. Set Environment Variables

```bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/jee-dashboard"
export JWT_SECRET="your-secret-key-here"
export WHATSAPP_ENABLED="false"  # Set to "true" if using WhatsApp
export TWILIO_ACCOUNT_SID=""  # If using WhatsApp
export TWILIO_AUTH_TOKEN=""   # If using WhatsApp
export WHATSAPP_FROM_NUMBER="" # If using WhatsApp
```

## 5. Deploy

```bash
npm run deploy
```

## 6. Get Your API URL

After deployment, you'll see output like:
```
endpoints:
  ANY - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/{proxy+}
  ANY - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
```

Use this URL in your frontend: `https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/api`

## 7. Test

```bash
curl https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/api/health
```

## View Logs

```bash
serverless logs -f api --tail
```

## Remove Deployment

```bash
npm run remove
```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

