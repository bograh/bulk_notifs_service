'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingAPI, type Plan, type Subscription, type Transaction } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Check, CreditCard, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'

export default function BillingPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingAPI.getPlans().then((r) => r.data),
  })

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingAPI.getSubscription().then((r) => r.data),
  })

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['billing', 'transactions'],
    queryFn: () => billingAPI.getTransactions().then((r) => r.data),
  })

  const subscribeMutation = useMutation({
    mutationFn: (planName: string) => billingAPI.subscribe(planName),
    onSuccess: (data) => {
      if (data.data.checkout_url) {
        window.location.href = data.data.checkout_url
      }
    },
    onError: () => toast({ title: 'Error', description: 'Failed to start checkout', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => billingAPI.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      toast({ title: 'Subscription cancelled' })
    },
  })

  const currentPlan = subscription?.plan_name || 'free'

  const features: Record<string, string[]> = {
    free: ['100 SMS/month', '500 emails/month', 'Basic analytics', 'Email support'],
    basic: ['5,000 SMS/month', '25,000 emails/month', 'Advanced analytics', 'Priority support', 'CSV import'],
    pro: ['25,000 SMS/month', '100,000 emails/month', 'Full analytics suite', 'Dedicated support', 'API access', 'Custom templates'],
    enterprise: ['100,000 SMS/month', '500,000 emails/month', 'White-label option', '24/7 phone support', 'SLA guarantee', 'Custom integrations'],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              You are on the <span className="font-semibold capitalize">{currentPlan}</span> plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">SMS Used</p>
                <p className="text-lg font-semibold">{subscription.sms_used.toLocaleString()} / {subscription.sms_quota.toLocaleString()}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${Math.min((subscription.sms_used / subscription.sms_quota) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Used</p>
                <p className="text-lg font-semibold">{subscription.email_used.toLocaleString()} / {subscription.email_quota.toLocaleString()}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${Math.min((subscription.email_used / subscription.email_quota) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={subscription.status === 'active' ? 'success' : 'outline'}>{subscription.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-lg font-semibold">${subscription.price_per_month.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
          {subscription.status === 'active' && currentPlan !== 'free' && (
            <CardFooter>
              <Button variant="outline" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Subscription
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan) => (
            <Card key={plan.name} className={currentPlan === plan.name ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="capitalize">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  ${plan.price_per_month.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {features[plan.name]?.map((feature) => (
                    <li key={feature} className="flex items-center text-sm">
                      <Check className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {currentPlan === plan.name ? (
                  <Button className="w-full" disabled>Current Plan</Button>
                ) : plan.price_per_month === 0 ? (
                  <Button className="w-full" variant="outline" disabled>Free</Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => subscribeMutation.mutate(plan.name)}
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${tx.amount.toFixed(2)}</p>
                    <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'destructive' : 'outline'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
