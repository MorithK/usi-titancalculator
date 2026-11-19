
import { type PurchaseSimulation } from '../utils/purchaseMath'
import { type Resource } from '../hooks/usePlayerResources'
import { formatScientific } from '../utils/resourceMath'

type PurchasePreviewProps = {
  preview: PurchaseSimulation
  resources: Resource[]
  onClose: () => void
}

export default function PurchasePreview({
  preview,
  resources,
  onClose
}: PurchasePreviewProps) {
  return (
    <div className="mt-5 rounded-lg border
      border-slate-700 bg-slate-900 p-4">

      <h4 className="mb-1 font-semibold text-cyan-400">
        Purchase Preview
      </h4>

      <p className="mb-4 text-sm text-slate-400">
        Snapshot only. No changes have been saved.
      </p>

      <p className="mb-4 text-sm text-green-400">
        {preview.totalLevelsBought} levels purchased
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-2 text-left">Upgrade</th>
              <th className="pb-2 text-right">Current</th>
              <th className="pb-2 text-right">Purchased</th>
              <th className="pb-2 text-right">Final Level</th>
            </tr>
          </thead>

          <tbody>
            {preview.items.map(item => (
              <tr key={item.id}
                className="border-t border-slate-800">

                <td className="py-2 text-white">
                  {item.name}
                </td>

                <td className="py-2 text-right font-mono">
                  {item.currentLevel}
                </td>

                <td className="py-2 text-right font-mono text-green-400">
                  +{item.levelsBought}
                </td>

                <td className="py-2 text-right font-mono text-cyan-400">
                  {item.finalLevel}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mb-2 mt-5 font-semibold text-cyan-400">
        Resource Balances
      </h4>

      <table className="w-full text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="pb-2 text-left">Resource</th>
            <th className="pb-2 text-right">Spent</th>
            <th className="pb-2 text-right">Remaining</th>
          </tr>
        </thead>

        <tbody>
          {resources
            .filter(resource =>
              preview.spent[resource.resource_type_id] !== undefined &&
              preview.spent[resource.resource_type_id] !== '0'
            )
            .map(resource => (
              <tr key={resource.resource_type_id}
                className="border-t border-slate-800">

                <td className="py-2 text-white">
                  {resource.resource_name}
                </td>

                <td className="py-2 text-right font-mono text-orange-400">
                  {formatScientific(
                    preview.spent[resource.resource_type_id]
                  )}
                </td>

                <td className="py-2 text-right font-mono text-emerald-400">
                  {formatScientific(
                    preview.remainingBalances[
                      resource.resource_type_id
                    ]
                  )}
                </td>

              </tr>
            ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 text-sm text-slate-400
          hover:text-white"
      >
        Close Preview
      </button>

    </div>
  )
}
