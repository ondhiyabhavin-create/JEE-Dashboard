const nodemailer = require('nodemailer');

// Create transporter with environment variables for flexibility
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'studentsdata27@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'jcfhprgbexfkjeji' // App Password (spaces removed)
  }
});

// Verify connection (non-blocking)
transporter.verify((error, success) => {
  if (error) {
    console.error('⚠️  Email service error:', error.message);
    console.error('   Please check:');
    console.error('   1. Email credentials are correct');
    console.error('   2. Gmail App Password is used (not regular password)');
    console.error('   3. 2-Step Verification is enabled on Gmail account');
    console.error('   4. "Less secure app access" is enabled OR App Password is used');
    console.error('   Email functionality will not work until this is fixed.');
  } else {
    console.log('✅ Email service ready');
  }
});

// Helper function to get header name from first user (for system emails)
const getHeaderName = async () => {
  try {
    const User = require('../models/User');
    const user = await User.findOne().select('headerName').sort({ updatedAt: -1 });
    return user?.headerName || 'Spectrum Student Data';
  } catch (error) {
    console.error('Error fetching header name:', error);
    return 'Spectrum Student Data';
  }
};

// Send password reset OTP email
const sendPasswordResetOTP = async (email, otp, headerName = null) => {
  const fromName = headerName || await getHeaderName();
  const fromEmail = process.env.EMAIL_USER || 'studentsdata27@gmail.com';
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Password Reset OTP - ${fromName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Password Reset OTP</h2>
        <p>You requested to reset your password for ${fromName} account.</p>
        <p>Your OTP (One-Time Password) is:</p>
        <div style="background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        <p>Enter this OTP on the password reset page to continue.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This OTP will expire in 10 minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send password changed confirmation
const sendPasswordChangedEmail = async (email, name, headerName = null) => {
  const fromName = headerName || await getHeaderName();
  const fromEmail = process.env.EMAIL_USER || 'studentsdata27@gmail.com';
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Password Changed - ${fromName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Password Changed Successfully</h2>
        <p>Hello ${name},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact your administrator immediately.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This is an automated message from ${fromName}.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password changed email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send visit reminder email with beautiful HTML template
const sendVisitReminder = async (email, studentName, visitDate, visitTime, reminderType, assignment = '', remarks = '', hoursUntil = null, headerName = null) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '10:00 AM';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Calculate time until visit if not provided
  let timeUntil;
  if (hoursUntil !== null) {
    // Use provided hours until, format appropriately
    if (hoursUntil >= 1) {
      const hours = Math.floor(hoursUntil);
      const minutes = Math.floor((hoursUntil - hours) * 60);
      if (minutes > 0) {
        timeUntil = `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        timeUntil = `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
    } else {
      const minutes = Math.floor(hoursUntil * 60);
      timeUntil = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  } else {
    // Default to reminder type
    if (reminderType === 'instant') {
      timeUntil = 'just now'; // Will be overridden by hoursUntil if provided
    } else {
      timeUntil = reminderType === '24h' ? '24 hours' : '6 hours';
    }
  }

  // Determine next reminder message based on hours until and reminder type
  let nextReminder;
  if (reminderType === 'instant') {
    if (hoursUntil !== null) {
      if (hoursUntil >= 24) {
        nextReminder = 'You will receive reminders 24 hours and 6 hours before your scheduled visit.';
      } else if (hoursUntil >= 6) {
        nextReminder = 'You will receive another reminder 6 hours before your scheduled visit.';
      } else {
        nextReminder = 'This is your final reminder before your visit.';
      }
    } else {
      nextReminder = 'You will receive reminders 24 hours and 6 hours before your scheduled visit.';
    }
  } else if (reminderType === '24h') {
    nextReminder = 'You will receive another reminder 6 hours before your scheduled visit.';
  } else {
    nextReminder = 'This is your final reminder before your visit.';
  }

  const fromName = headerName || await getHeaderName();
  const fromEmail = process.env.EMAIL_USER || 'studentsdata27@gmail.com';
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Visit Reminder - ${timeUntil} before your scheduled visit`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visit Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Visit Reminder
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                      ${timeUntil} before your scheduled visit
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Hello <strong style="color: #667eea;">${studentName}</strong>,
                    </p>
                    <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      This is a friendly reminder that you have a scheduled visit coming up. Please make sure you are prepared.
                    </p>
                    
                    <!-- Visit Details Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <h2 style="margin: 0 0 10px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                            ${formatDate(visitDate)}
                          </h2>
                          <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 20px; font-weight: 500;">
                            ${formatTime(visitTime)}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    ${assignment ? `
                    <!-- Assignment Section -->
                    <div style="background-color: #f9fafb; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 18px; font-weight: 600;">
                        Assignment
                      </h3>
                      <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                        ${assignment}
                      </p>
                    </div>
                    ` : ''}
                    
                    ${remarks ? `
                    <!-- Remarks Section -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 18px; font-weight: 600;">
                        Remarks
                      </h3>
                      <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
                        ${remarks}
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- Call to Action -->
                    <div style="text-align: center; margin: 40px 0 20px 0;">
                      <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 500;">
                        We look forward to seeing you!
                      </p>
                    </div>
                    
                    <!-- Footer Note -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 30px; margin-top: 30px;">
                      <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 13px; line-height: 1.6; text-align: center;">
                        ${nextReminder}
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                        This is an automated reminder from ${fromName}. If you have any questions, please contact your administrator.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} ${fromName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Visit reminder (${reminderType}) email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending visit reminder email to ${email}:`, error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetOTP,
  sendPasswordChangedEmail,
  sendVisitReminder
};

