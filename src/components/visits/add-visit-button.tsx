'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddVisitDialog } from './add-visit-dialog'

/**
 * Renders an "Add Visit" button and a controlled dialog for creating a visit.
 *
 * The component manages the dialog's open state internally and composes a Button with a Plus icon and an AddVisitDialog whose visibility is controlled by that state.
 *
 * @returns A fragment containing the "Add Visit" Button and the controlled AddVisitDialog component
 */
export function AddVisitButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Visit
      </Button>
      <AddVisitDialog open={open} onOpenChange={setOpen} />
    </>
  )
}