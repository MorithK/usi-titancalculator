
import ResourcePanel from './ResourcePanel'
import TitanComponentsPanel from './TitanComponentsPanel'
import CrewUpgradesPanel from './CrewUpgradesPanel'
import { usePlayerResources } from '../hooks/usePlayerResources'
import { type WriteGuard } from '../utils/writeGuard'
import { type ApplyPurchases } from '../utils/purchaseApi'

export default function CorePanel({
  userId,
  highestSector,
  resourceRevision,
  writeGuard,
  onApplyPurchases
}: {
  userId: string
  highestSector: number
  resourceRevision: number
  writeGuard: WriteGuard
  onApplyPurchases: ApplyPurchases
}) {
  const resourceState = usePlayerResources(
    userId,
    resourceRevision
  )

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ResourcePanel
          userId={userId}
          resourceState={resourceState}
          resourceType="Fragment"
          writeGuard={writeGuard}
        />

        <ResourcePanel
          userId={userId}
          resourceState={resourceState}
          resourceType="Specimen"
          writeGuard={writeGuard}
        />
      </div>

      <TitanComponentsPanel
        userId={userId}
        highestSector={highestSector}
        resourceState={resourceState}
        resourceRevision={resourceRevision}
        writeGuard={writeGuard}
        onApplyPurchases={onApplyPurchases}
      />

      <CrewUpgradesPanel
        userId={userId}
        highestSector={highestSector}
        resourceState={resourceState}
        resourceRevision={resourceRevision}
        writeGuard={writeGuard}
        onApplyPurchases={onApplyPurchases}
      />
    </>
  )
}
