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

// Send password reset OTP email
const sendPasswordResetOTP = async (email, otp) => {
  const mailOptions = {
    from: 'studentsdata27@gmail.com',
    to: email,
    subject: 'Password Reset OTP - Spectrum Student Data',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Password Reset OTP</h2>
        <p>You requested to reset your password for Spectrum Student Data account.</p>
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
const sendPasswordChangedEmail = async (email, name) => {
  const mailOptions = {
    from: 'studentsdata27@gmail.com',
    to: email,
    subject: 'Password Changed - Spectrum Student Data',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Password Changed Successfully</h2>
        <p>Hello ${name},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact your administrator immediately.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This is an automated message from Spectrum Student Data.
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

// Send visit reminder email
const sendVisitReminder = async (email, studentName, visitDate, visitTime, reminderType) => {
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

  const timeUntil = reminderType === '24h' 
    ? '24 hours' 
    : '6 hours';

  const mailOptions = {
    from: 'studentsdata27@gmail.com',
    to: email,
    subject: `Visit Reminder - ${timeUntil} before scheduled visit`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Visit Reminder</h2>
        <p>Hello ${studentName},</p>
        <p>This is a reminder that you have a scheduled visit coming up:</p>
        <div style="background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; font-size: 18px;"><strong>Date:</strong> ${formatDate(visitDate)}</p>
          <p style="margin: 5px 0; font-size: 18px;"><strong>Time:</strong> ${formatTime(visitTime)}</p>
        </div>
        <p>Please make sure you are prepared for your visit.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This is an automated reminder from Spectrum Student Data. You will receive another reminder 6 hours before your scheduled visit.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Visit reminder (${reminderType}) email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending visit reminder email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetOTP,
  sendPasswordChangedEmail,
  sendVisitReminder
};

