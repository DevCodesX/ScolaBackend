const nodemailer = require('nodemailer');

// Create transporter - supports both SMTP_* and EMAIL_* env var naming
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '2525'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
});

/**
 * Send email verification link to user
 */
async function sendVerificationEmail(email, token, name) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyLink = `${frontendUrl}/#/verify-email?token=${token}`;

    const mailOptions = {
        from: `"Scola" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@scola.com'}>`,
        to: email,
        subject: 'تفعيل حسابك في Scola - Verify your Scola account',
        html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; overflow: hidden;">
            <div style="padding: 40px 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700;">Scola</h1>
                <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">نظام إدارة المؤسسات التعليمية</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 16px 16px 0 0;">
                <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px;">مرحباً ${name} 👋</h2>
                <p style="color: #4a4a68; line-height: 1.7; margin: 0 0 24px;">
                    شكراً لتسجيلك في Scola. لتفعيل حسابك، يرجى النقر على الزر أدناه:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102,126,234,0.4);">
                        تفعيل الحساب
                    </a>
                </div>
                <p style="color: #8888a0; font-size: 13px; line-height: 1.6;">
                    إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.
                    <br/>هذا الرابط صالح لمدة 24 ساعة.
                </p>
            </div>
            <div style="background: #f8f9ff; padding: 20px 30px; text-align: center;">
                <p style="color: #8888a0; font-size: 12px; margin: 0;">© 2024 Scola. جميع الحقوق محفوظة</p>
            </div>
        </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send verification email to ${email}:`, error.message);
        return false;
    }
}

/**
 * Send teacher invitation email
 * @param {string} email - Recipient email
 * @param {string} firstName - Teacher's first name
 * @param {string} inviteLink - Full invitation accept link
 * @param {string} institutionName - Name of the inviting institution
 */
async function sendInvitationEmail(email, firstName, inviteLink, institutionName) {
    const mailOptions = {
        from: `"Scola" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@scola.com'}>`,
        to: email,
        subject: `دعوة للانضمام إلى ${institutionName} عبر Scola`,
        html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; overflow: hidden;">
            <div style="padding: 40px 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700;">Scola</h1>
                <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">نظام إدارة المؤسسات التعليمية</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 16px 16px 0 0;">
                <h2 style="color: #1a1a2e; margin: 0 0 16px; font-size: 22px;">مرحباً ${firstName} 👋</h2>
                <p style="color: #4a4a68; line-height: 1.7; margin: 0 0 8px;">
                    تمت دعوتك للانضمام إلى <strong style="color: #667eea;">${institutionName}</strong> كمدرس عبر منصة Scola.
                </p>
                <p style="color: #4a4a68; line-height: 1.7; margin: 0 0 24px;">
                    للقبول وإنشاء حسابك، يرجى النقر على الزر أدناه:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102,126,234,0.4);">
                        قبول الدعوة والانضمام
                    </a>
                </div>
                <div style="background: #f0f4ff; border-radius: 12px; padding: 16px; margin: 24px 0;">
                    <p style="color: #667eea; font-size: 13px; font-weight: 600; margin: 0 0 4px;">📋 تفاصيل الدعوة</p>
                    <p style="color: #4a4a68; font-size: 13px; margin: 0; line-height: 1.8;">
                        المؤسسة: <strong>${institutionName}</strong><br/>
                        الدور: مدرس
                    </p>
                </div>
                <p style="color: #8888a0; font-size: 13px; line-height: 1.6;">
                    إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة.
                    <br/>هذا الرابط صالح لمدة <strong>7 أيام</strong>.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p dir="ltr" style="color: #8888a0; font-size: 13px; line-height: 1.6; text-align: left;">
                    You've been invited to join <strong>${institutionName}</strong> as a teacher on Scola.
                    <br/>Click the button above to accept the invitation. This link expires in 7 days.
                </p>
            </div>
            <div style="background: #f8f9ff; padding: 20px 30px; text-align: center;">
                <p style="color: #8888a0; font-size: 12px; margin: 0;">© 2024 Scola. جميع الحقوق محفوظة</p>
            </div>
        </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Invitation email sent to ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send invitation email to ${email}:`, error.message);
        return false;
    }
}

module.exports = { sendVerificationEmail, sendInvitationEmail };
