import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { creditApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { formatETB, formatDate } from '@/lib/utils'

export default function CreditPage() {
  const qc = useQueryClient()
  const [loanAmount, setLoanAmount] = useState('')
  const [showApply, setShowApply] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['credit'],
    queryFn: () => creditApi.getScore().then((r) => r.data.data),
  })

  const applyMutation = useMutation({
    mutationFn: () => creditApi.applyLoan(Number(loanAmount)),
    onSuccess: () => {
      toast.success('Loan approved!')
      qc.invalidateQueries({ queryKey: ['credit'] })
      setShowApply(false)
      setLoanAmount('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Loan application failed'),
  })

  const repayMutation = useMutation({
    mutationFn: (loanId: string) => creditApi.repayLoan(loanId),
    onSuccess: () => {
      toast.success('Loan repaid! Credit score updated.')
      qc.invalidateQueries({ queryKey: ['credit'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Repayment failed'),
  })

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-surface-card rounded-2xl" />
      <div className="h-24 bg-surface-card rounded-2xl" />
    </div>
  )

  const score = data?.score || 0
  const scoreColor = score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  const activeLoan = data?.loans?.find((l: any) => l.status === 'ACTIVE')

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Score card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-500/20 to-surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">Credit Score</p>
              <p className={`text-5xl font-bold mt-1 ${scoreColor}`}>{Math.round(score)}</p>
              <p className="text-gray-500 text-xs mt-1">out of 100</p>
            </div>
            <div className="w-20 h-20 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2a2a2a" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f97316" strokeWidth="3"
                  strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
              </svg>
              <TrendingUp className="w-6 h-6 text-brand-400 absolute inset-0 m-auto" />
            </div>
          </div>
          {/* Score bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Poor</span><span>Fair</span><span>Good</span><span>Excellent</span>
            </div>
            <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                style={{ width: `${score}%`, transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>
        <CardContent className="py-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-xs">Credit Limit</p>
              <p className="text-white font-semibold">{formatETB(data?.limit || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Status</p>
              <p className={`text-sm font-medium ${score >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {score >= 50 ? 'Eligible' : 'Not eligible'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How score is calculated */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium text-white">How your score is calculated</p>
          {[
            { label: 'Order completion rate', points: '40 pts', icon: '📦' },
            { label: 'On-time loan repayment', points: '40 pts', icon: '✅' },
            { label: 'Account age & volume',   points: '20 pts', icon: '📈' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span className="text-gray-400 text-sm">{item.label}</span>
              </div>
              <span className="text-brand-400 text-sm font-medium">{item.points}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Active loan */}
      {activeLoan && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-medium text-white">Active Loan</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="text-white font-medium">{formatETB(activeLoan.amount + activeLoan.fee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Due date</span>
              <span className="text-yellow-400">{formatDate(activeLoan.dueDate)}</span>
            </div>
            <Button className="w-full" loading={repayMutation.isPending}
              onClick={() => repayMutation.mutate(activeLoan.id)}>
              Repay Loan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Apply for loan */}
      {!activeLoan && score >= 50 && (
        <div className="space-y-3">
          {!showApply ? (
            <Button variant="outline" className="w-full" onClick={() => setShowApply(true)}>
              Apply for Micro-Loan
            </Button>
          ) : (
            <Card>
              <CardContent className="space-y-3 py-4">
                <p className="text-sm font-medium text-white">Apply for Loan</p>
                <Input
                  label={`Amount (max ${formatETB(data?.limit || 0)})`}
                  type="number"
                  placeholder="2000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                />
                {loanAmount && (
                  <p className="text-xs text-gray-500">
                    Fee: {formatETB(Math.round(Number(loanAmount) * 0.07))} (7%) · Total repay: {formatETB(Math.round(Number(loanAmount) * 1.07))}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowApply(false)}>Cancel</Button>
                  <Button className="flex-1" loading={applyMutation.isPending}
                    onClick={() => applyMutation.mutate()}
                    disabled={!loanAmount || Number(loanAmount) <= 0}>
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loan history */}
      {data?.loans?.filter((l: any) => l.status !== 'ACTIVE').length > 0 && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-white">Loan History</p>
            {data.loans.filter((l: any) => l.status !== 'ACTIVE').map((loan: any) => (
              <div key={loan.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">{formatETB(loan.amount)}</p>
                  <p className="text-gray-500 text-xs">{formatDate(loan.createdAt)}</p>
                </div>
                <StatusBadge status={loan.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
