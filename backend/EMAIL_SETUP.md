# Email Configuration Guide

## Email Service Code

The email service is located in `backend/utils/emailService.js` and is used for:
- ✅ Forgot password OTP emails
- ✅ Password changed confirmation emails
- ✅ Visit reminder emails (24h and 6h before)

**The same email service handles all email functionality.**

## Email Configuration

The email service uses Gmail with App Password authentication. It reads credentials from environment variables:

- `EMAIL_USER` - Your Gmail address (e.g., `studentsdata27@gmail.com`)
- `EMAIL_PASSWORD` - Your Gmail App Password (16-character code, NOT your regular password)

## Where to Add Email Credentials

You have **TWO Lambda functions** that need email access:

### 1. Main API Lambda Function (`api`)
- **Function Name**: `jee-dashboard-backend-dev-api`
- **Purpose**: Handles all API requests (forgot password, login, etc.)
- **Needs Email**: ✅ Yes (for forgot password emails)

### 2. Visit Notifications Lambda Function (`visitNotifications`)
- **Function Name**: `jee-dashboard-backend-dev-visitNotifications`
- **Purpose**: Sends visit reminder emails every 15 minutes
- **Needs Email**: ✅ Yes (for visit reminder emails)

## Option 1: Automatic via Serverless Deployment (Recommended)

The `serverless.yml` file is already configured to include email environment variables. When you deploy with:

```bash
cd backend
npm run deploy
```

The environment variables from your `.env` file will be automatically set for BOTH Lambda functions.

**Make sure your `.env` file contains:**
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
```

## Option 2: Manual Configuration in AWS Console

If you need to set them manually in AWS Lambda Console:

### For Main API Lambda:
1. Go to AWS Lambda Console
2. Find function: `jee-dashboard-backend-dev-api`
3. Go to **Configuration** → **Environment variables**
4. Add:
   - Key: `EMAIL_USER`, Value: `your-email@gmail.com`
   - Key: `EMAIL_PASSWORD`, Value: `your-16-character-app-password`

### For Visit Notifications Lambda:
1. Go to AWS Lambda Console
2. Find function: `jee-dashboard-backend-dev-visitNotifications`
3. Go to **Configuration** → **Environment variables**
4. Add:
   - Key: `EMAIL_USER`, Value: `your-email@gmail.com`
   - Key: `EMAIL_PASSWORD`, Value: `your-16-character-app-password`

## How to Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** → **2-Step Verification** (must be enabled)
3. Scroll down and click **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter name: "JEE Dashboard"
6. Click **Generate**
7. Copy the 16-character password (remove spaces if any)
8. Use this as your `EMAIL_PASSWORD`

## Testing Email Configuration

After setting up, test by:
1. Using "Forgot Password" feature on the login page
2. Scheduling a visit for a student with an email address
3. Check Lambda logs to see if emails are being sent

## Troubleshooting

If emails are not sending, check:
1. ✅ `EMAIL_USER` and `EMAIL_PASSWORD` are set in BOTH Lambda functions
2. ✅ Gmail App Password is correct (16 characters, no spaces)
3. ✅ 2-Step Verification is enabled on Gmail account
4. ✅ Check CloudWatch logs for error messages

## Current Email Service Code

The email service is in `backend/utils/emailService.js` and uses:
- **Service**: Gmail
- **Authentication**: App Password (not regular password)
- **Library**: Nodemailer

All email functions (forgot password, visit reminders) use the same service and configuration.

