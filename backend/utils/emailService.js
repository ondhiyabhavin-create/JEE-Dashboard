const nodemailer = require('nodemailer');

// Create transporter with hardcoded credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'studentsdata27@gmail.com', // Hardcoded email
    pass: 'jcfhprgbexfkjeji' // Hardcoded Gmail App Password
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
    // Lazy load User model to avoid circular dependencies
    const User = require('../models/User');
    const user = await User.findOne().select('headerName').sort({ updatedAt: -1 }).lean();
    return user?.headerName || 'Spectrum Student Data';
  } catch (error) {
    console.error('Error fetching header name:', error);
    // Return default if there's any error (database not connected, etc.)
    return 'Spectrum Student Data';
  }
};

// Send password reset OTP email
const sendPasswordResetOTP = async (email, otp, headerName = null) => {
  const fromName = headerName !== null && headerName !== undefined ? headerName : await getHeaderName();
  const fromEmail = 'studentsdata27@gmail.com'; // Hardcoded email
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
  const fromName = headerName !== null && headerName !== undefined ? headerName : await getHeaderName();
  const fromEmail = 'studentsdata27@gmail.com'; // Hardcoded email
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

  const fromName = headerName !== null && headerName !== undefined ? headerName : await getHeaderName();
  const fromEmail = 'studentsdata27@gmail.com'; // Hardcoded email
  
  // Determine subject line based on reminder type
  let subjectLine;
  if (reminderType === 'instant') {
    subjectLine = `Academic Visit Confirmation - ${formatDate(visitDate)} at ${formatTime(visitTime)}`;
  } else if (reminderType === '24h') {
    subjectLine = `Academic Visit Reminder - ${formatDate(visitDate)} at ${formatTime(visitTime)}`;
  } else {
    subjectLine = `Academic Visit Reminder - ${formatDate(visitDate)} at ${formatTime(visitTime)}`;
  }
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: subjectLine,
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
                      Your scheduled visit details
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Hello <strong style="color: #667eea;">${studentName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      This email is to confirm the scheduled academic visit planned for you.
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      As discussed, the purpose of this visit is to review your JEE preparation, discuss concepts, and work through the problems and doubts you are currently facing in your learning process. The session is intended to provide guidance and clarification to support your ongoing studies.
                    </p>
                    
                    <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      Please find the visit timing details below. We look forward to meeting you at the scheduled time and assisting you with your preparation.
                    </p>
                    
                    <!-- Visit Details Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 15px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                            Expected Visit Timing
                          </p>
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
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                        This is an automated reminder from ${fromName}. If you have any questions or need to reschedule, please contact your administrator.
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

// Send visit cancellation email
const sendVisitCancellation = async (email, studentName, visitDate, visitTime, headerName = null) => {
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

  const fromName = headerName !== null && headerName !== undefined ? headerName : await getHeaderName();
  const fromEmail = 'studentsdata27@gmail.com'; // Hardcoded email
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Visit Cancelled - ${fromName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visit Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Red Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Visit Cancelled
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                      Your scheduled visit has been cancelled
                    </p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Hello <strong style="color: #ef4444;">${studentName}</strong>,
                    </p>
                    <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      We regret to inform you that your scheduled visit has been cancelled. Please see the details below.
                    </p>
                    
                    <!-- Cancelled Visit Details Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border: 2px solid #ef4444;">
                      <tr>
                        <td style="text-align: center;">
                          <div style="margin-bottom: 15px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
                              <circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2" fill="none"/>
                              <path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                          </div>
                          <h2 style="margin: 0 0 10px 0; color: #991b1b; font-size: 24px; font-weight: 600;">
                            ${formatDate(visitDate)}
                          </h2>
                          <p style="margin: 0; color: #991b1b; font-size: 20px; font-weight: 500;">
                            ${formatTime(visitTime)}
                          </p>
                          <p style="margin: 15px 0 0 0; color: #dc2626; font-size: 16px; font-weight: 600;">
                            ❌ CANCELLED
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Information Message -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
                      <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                        <strong>Note:</strong> If you have any questions about this cancellation or would like to reschedule, please contact your administrator.
                      </p>
                    </div>
                    
                    <!-- Footer Note -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 30px; margin-top: 30px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                        This is an automated notification from ${fromName}. If you have any questions, please contact your administrator.
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
    console.log(`✅ Visit cancellation email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending visit cancellation email to ${email}:`, error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetOTP,
  sendPasswordChangedEmail,
  sendVisitReminder,
  sendVisitCancellation
};

