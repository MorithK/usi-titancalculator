
import ResourcePanel from './ResourcePanel'
import TitanComponentsPanel from './TitanComponentsPanel'
import CrewUpgradesPanel from './CrewUpgradesPanel'
import { usePlayerResources } from '../hooks/usePlayerResources'
import { type WriteGuard } from '../utils/writeGuard'
import { type ApplyPurchases } from '../utils/purchaseApi'
import SaveImportTest from "@/components/SaveImportTest";

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
    <SaveImportTest />
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
