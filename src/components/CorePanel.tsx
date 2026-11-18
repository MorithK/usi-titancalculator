
import ResourcePanel from './ResourcePanel'
import TitanComponentsPanel from './TitanComponentsPanel'
import { usePlayerResources } from '../hooks/usePlayerResources'

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
      />

      <TitanComponentsPanel
        userId={userId}
        highestSector={highestSector}
        resourceState={resourceState}
      />
    </>
  )
}

