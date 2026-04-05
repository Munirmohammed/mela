import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ArrowRight, KeyRound, Store, MapPin } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'

const ZONES = ['BOLE', 'KIRKOS', 'YEKA', 'ARADA', 'LIDETA', 'NIFAS_SILK']

type Step = 'phone' | 'register' | 'otp'

export default function AuthPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ ownerName: '', shopName: '', zone: 'BOLE', address: '' })

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(phone),
    onSuccess: () => { setIsNew(false); setStep('otp') },
    onError: (err: any) => {
      if (err.response?.status === 404) { setIsNew(true); setStep('register') }
      else toast.error(err.response?.data?.message || 'Something went wrong')
    },
  })

  const registerMutation = useMutation({
    mutationFn: () => authApi.register({ phone, ...form }),
    onSuccess: () => { setStep('otp') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Registration failed'),
  })

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyOtp({ phone, code: otp }),
    onSuccess: ({ data }) => {
      setTokens(data.data.accessToken, data.data.refreshToken, data.data.role)
      toast.success('Welcome to Mela!')
      navigate(data.data.role === 'ADMIN' ? '/admin' : '/')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Invalid OTP'),
  })

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
          <span className="text-white font-bold text-2xl">ሜ</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Mela</h1>
        <p className="text-gray-500 text-sm mt-1">ሜላ — The Digital Merkato</p>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Step: Phone */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white">Get started</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your phone number</p>
            </div>
            <Input
              label="Phone Number"
              placeholder="+251 9XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
              type="tel"
            />
            <Button
              className="w-full"
              size="lg"
              loading={loginMutation.isPending}
              onClick={() => loginMutation.mutate()}
              disabled={phone.length < 10}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: Register */}
        {step === 'register' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-white">Create your shop</h2>
              <p className="text-gray-500 text-sm mt-1">Tell us about your business</p>
            </div>
            <Input label="Your Name" placeholder="Abebe Kebede" value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              icon={<Phone className="w-4 h-4" />} />
            <Input label="Shop Name" placeholder="Abebe Mini Market" value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              icon={<Store className="w-4 h-4" />} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Zone / Area</label>
              <select
                className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors"
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
              >
                {ZONES.map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
              </select>
            </div>
            <Input label="Address" placeholder="Near Edna Mall, Bole Road" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              icon={<MapPin className="w-4 h-4" />} />
            <Button className="w-full" size="lg"
              loading={registerMutation.isPending}
              onClick={() => registerMutation.mutate()}
              disabled={!form.ownerName || !form.shopName || !form.address}
            >
              Register Shop <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-5 h-5 text-brand-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Enter OTP</h2>
              <p className="text-gray-500 text-sm mt-1">Sent to <span className="text-white">{phone}</span></p>
            </div>
            <Input
              label="6-digit code"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            <Button className="w-full" size="lg"
              loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
              disabled={otp.length !== 6}
            >
              Verify & Enter
            </Button>
            <button
              className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
              onClick={() => setStep('phone')}
            >
              ← Change number
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
