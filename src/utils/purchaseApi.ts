
import { supabase } from './supabase'
import { type PurchaseSimulation } from './purchaseMath'

export type PurchaseType = 'titan' | 'crew'

export type AppliedPurchase = {
  total_levels_bought: number
  levels: Record<string, number>
  spent: Record<string, string>
  remaining_balances: Record<string, string>
  applied_at: string
}

export type ApplyPurchases = (
  purchaseType: PurchaseType,
  preview: PurchaseSimulation
) => Promise<AppliedPurchase>

export async function applyPurchasePreview(
  purchaseType: PurchaseType,
  preview: PurchaseSimulation
): Promise<AppliedPurchase> {

  const purchases = preview.items
    .filter(item => item.levelsBought > 0)
    .map(item => ({
      purchase_id: Number(item.id),
      expected_upgrade_id: item.expectedUpgradeId,
      expected_level: item.currentLevel,
      levels_to_buy: item.levelsBought
    }))

  if (purchases.length === 0) {
    throw new Error('No levels to purchase.')
  }

  const { data, error } = await supabase.rpc(
    'apply_upgrade_purchases',
    {
      p_purchase_type: purchaseType,
      p_purchases: purchases
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('No purchase result returned.')
  }

  return data as AppliedPurchase
}
