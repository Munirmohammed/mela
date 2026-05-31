import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../src/components/ui/Screen'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { api } from '../../src/lib/api'
import { getErrorMessage } from '../../src/lib/apiError'
import { formatETB, formatDate } from '../../src/lib/format'
import { genIdempotencyKey } from '../../src/lib/ids'
import { colors, radius, spacing } from '../../src/theme'

export default function WalletScreen() {
  const qc = useQueryClient()
  const [topUpAmount, setTopUpAmount] = useState('')
  const [loanAmount, setLoanAmount] = useState('')

  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.payments.wallet() })
  const txns = useQuery({ queryKey: ['walletTx'], queryFn: () => api.payments.walletTransactions() })
  const credit = useQuery({ queryKey: ['credit'], queryFn: () => api.credit.getScore() })

  const refreshMoney = () => {
    void qc.invalidateQueries({ queryKey: ['wallet'] })
    void qc.invalidateQueries({ queryKey: ['walletTx'] })
    void qc.invalidateQueries({ queryKey: ['credit'] })
  }

  const topUp = useMutation({
    mutationFn: () => api.payments.topUp(Number(topUpAmount), genIdempotencyKey()),
    onSuccess: async (res) => {
      setTopUpAmount('')
      if (res.checkoutUrl) await WebBrowser.openBrowserAsync(res.checkoutUrl)
      refreshMoney()
    },
    onError: (e) => Alert.alert('Top-up failed', getErrorMessage(e)),
  })

  const applyLoan = useMutation({
    mutationFn: () => api.credit.applyLoan(Number(loanAmount)),
    onSuccess: () => {
      setLoanAmount('')
      refreshMoney()
    },
    onError: (e) => Alert.alert('Loan request failed', getErrorMessage(e)),
  })

  const repay = useMutation({
    mutationFn: (loanId: string) => api.credit.repayLoan(loanId),
    onSuccess: refreshMoney,
    onError: (e) => Alert.alert('Repay failed', getErrorMessage(e)),
  })

  const score = credit.data?.score ?? 0
  const limit = credit.data?.limit ?? 0
  const activeLoan = credit.data?.loans?.find((l) => l.status === 'ACTIVE')
  const eligible = score >= 50

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={styles.title}>Wallet</Text>

        {/* Balance */}
        <Card>
          <Text style={styles.dim}>Balance</Text>
          <Text style={styles.balance}>{formatETB(wallet.data?.balance ?? 0)}</Text>
          <View style={{ height: spacing.md }} />
          <Input
            placeholder="Amount to top up"
            keyboardType="number-pad"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
          />
          <Button
            title="Top up via Chapa"
            loading={topUp.isPending}
            disabled={!topUpAmount || Number(topUpAmount) <= 0}
            onPress={() => topUp.mutate()}
          />
        </Card>

        {/* Credit */}
        <Card>
          <Text style={styles.section}>Credit score</Text>
          <Text style={styles.score}>{Math.round(score)}/100</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(100, score)}%` }]} />
          </View>
          <Text style={styles.dim}>Limit: {formatETB(limit)}</Text>
          {!eligible ? (
            <Text style={styles.hint}>
              Reach a score of 50 by completing more orders on time to unlock credit.
            </Text>
          ) : null}

          {activeLoan ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={styles.text}>
                Active loan: {formatETB(activeLoan.amount)} (fee {formatETB(activeLoan.fee)}) · due{' '}
                {formatDate(activeLoan.dueDate)}
              </Text>
              <Button
                title="Repay loan"
                variant="secondary"
                loading={repay.isPending}
                onPress={() => repay.mutate(activeLoan.id)}
              />
            </View>
          ) : eligible ? (
            <View style={{ marginTop: spacing.md }}>
              <Input
                placeholder={`Loan amount (max ${formatETB(limit)})`}
                keyboardType="number-pad"
                value={loanAmount}
                onChangeText={setLoanAmount}
              />
              <Button
                title="Apply for loan"
                loading={applyLoan.isPending}
                disabled={!loanAmount || Number(loanAmount) <= 0}
                onPress={() => applyLoan.mutate()}
              />
            </View>
          ) : null}
        </Card>

        {/* Ledger */}
        <Card>
          <Text style={styles.section}>Recent transactions</Text>
          {(txns.data ?? []).length === 0 ? (
            <Text style={styles.dim}>No transactions yet</Text>
          ) : (
            (txns.data ?? []).map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>{tx.reason}</Text>
                  <Text style={styles.dim}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text style={{ color: tx.type === 'CREDIT' ? colors.success : colors.danger }}>
                  {tx.type === 'CREDIT' ? '+' : '−'}
                  {formatETB(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: 13 },
  text: { color: colors.text, fontSize: 14 },
  balance: { color: colors.brand, fontSize: 34, fontWeight: '800', marginTop: spacing.xs },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  score: { color: colors.text, fontSize: 28, fontWeight: '800' },
  barTrack: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: 5,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 10, backgroundColor: colors.brand, borderRadius: 5 },
  hint: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
})
