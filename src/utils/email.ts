import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env['EMAIL_HOST'],
  port: Number(process.env['EMAIL_PORT']) || 587,
  secure: process.env['EMAIL_PORT'] === '465',
  auth: {
    user: process.env['EMAIL_USER'],
    pass: process.env['EMAIL_PASS'],
  },
});

export const sendPasswordReset = async (to: string, name: string, resetToken: string): Promise<void> => {
  const resetUrl = `${process.env['PASSWORD_RESET_BASE_URL']}/${resetToken}`;
  await transporter.sendMail({
    from: process.env['EMAIL_FROM'],
    to,
    subject: 'Campus Fair — Reset your password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#FDFAF5;border-radius:12px;">
        <h2 style="color:#2D1F0E;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#6B5A48;font-size:14px;">Hi ${name},</p>
        <p style="color:#6B5A48;font-size:14px;">
          We received a request to reset your Campus Fair password.
          This link expires in <strong>30 minutes</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#E8561A;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#9E8E7A;font-size:12px;">If you didn't request this, ignore this email.</p>
        <p style="color:#9E8E7A;font-size:12px;">— The Campus Fair Team</p>
      </div>
    `,
  });
};

export const sendWelcome = async (to: string, name: string, role: string): Promise<void> => {
  const roleLabel: Record<string, string> = { student: 'Student', vendor: 'Vendor', organizer: 'Organizer' };
  await transporter.sendMail({
    from: process.env['EMAIL_FROM'],
    to,
    subject: `Welcome to Campus Fair, ${name.split(' ')[0]}!`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#FDFAF5;border-radius:12px;">
        <h2 style="color:#2D1F0E;">Welcome, ${name.split(' ')[0]}! 🎉</h2>
        <p style="color:#6B5A48;font-size:14px;">Your <strong>${roleLabel[role] ?? role}</strong> account is ready.</p>
        <p style="color:#9E8E7A;font-size:12px;margin-top:32px;">— The Campus Fair Team</p>
      </div>
    `,
  });
};
