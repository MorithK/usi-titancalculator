
import ResourcePanel from './ResourcePanel'
import TitanComponentsPanel from './TitanComponentsPanel'
import { usePlayerResources } from '../hooks/usePlayerResources'
import CrewUpgradesPanel from './CrewUpgradesPanel'

export default function CorePanel({
  userId,
  highestSector,
  resourceRevision
}: {
  userId: string
  highestSector: number
  resourceRevision: number
}) { 
  const resourceState = usePlayerResources( userId, resourceRevision )
  
  return (
    <>
      <ResourcePanel
        userId={userId}
        resourceState={resourceState}
        resourceType="Fragment"
      />

      <ResourcePanel
        userId={userId}
        resourceState={resourceState}
        resourceType="Specimen"
      />

      <TitanComponentsPanel
        userId={userId}
        highestSector={highestSector}
        resourceState={resourceState}
        resourceRevision={resourceRevision}
      />

      <CrewUpgradesPanel
        userId={userId}
        highestSector={highestSector}
        resourceState={resourceState}
        resourceRevision={resourceRevision}
      />
    </>
  )
}

