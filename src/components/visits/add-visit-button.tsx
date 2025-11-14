'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddVisitDialog } from './add-visit-dialog'

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
