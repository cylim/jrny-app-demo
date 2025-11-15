'use client'

import { useMutation } from 'convex/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { dateStringToTimestamp, timestampToDateString } from '@/lib/date-utils'
import { api } from '~@/convex/_generated/api'
import type { Id } from '~@/convex/_generated/dataModel'
import { CitySearch } from './city-search'

interface AddVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editVisit?: {
    _id: Id<'visits'>
    cityId: Id<'cities'>
    startDate: number
    endDate: number
    notes?: string
    isPrivate: boolean
  }
}

/**
 * Render a dialog for creating a new visit or editing an existing one.
 *
 * Validates required fields (city, start date, end date) and that start date is before end date,
 * then calls the appropriate create or update mutation. On successful mutation the dialog closes;
 * on failure an error message is shown inside the form.
 *
 * @param open - Controls whether the dialog is visible
 * @param onOpenChange - Callback invoked with the new open state to close or open the dialog
 * @param editVisit - Optional visit object; when provided the form initializes for editing that visit
 * @returns The dialog element containing the visit form used to add or update a visit
 */
export function AddVisitDialog({
  open,
  onOpenChange,
  editVisit,
}: AddVisitDialogProps) {
  const [cityId, setCityId] = useState<Id<'cities'> | null>(
    editVisit?.cityId ?? null,
  )
  const [startDate, setStartDate] = useState(
    editVisit?.startDate ? timestampToDateString(editVisit.startDate) : '',
  )
  const [endDate, setEndDate] = useState(
    editVisit?.endDate ? timestampToDateString(editVisit.endDate) : '',
  )
  const [notes, setNotes] = useState(editVisit?.notes ?? '')
  const [isPrivate, setIsPrivate] = useState(editVisit?.isPrivate ?? false)
  const [error, setError] = useState<string | null>(null)

  const createVisit = useMutation(api.visits.createVisit)
  const updateVisit = useMutation(api.visits.updateVisit)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!cityId || !startDate || !endDate) {
      setError('Please fill in all required fields')
      return
    }

    const startTimestamp = dateStringToTimestamp(startDate)
    const endTimestamp = dateStringToTimestamp(endDate)

    if (startTimestamp >= endTimestamp) {
      setError('Start date must be before end date')
      return
    }

    try {
      if (editVisit) {
        const result = await updateVisit({
          visitId: editVisit._id,
          startDate: startTimestamp,
          endDate: endTimestamp,
          notes: notes || undefined,
          isPrivate,
        })
        if (result.success) {
          onOpenChange(false)
        } else {
          setError(result.error || 'Failed to update visit')
        }
      } else {
        const result = await createVisit({
          cityId,
          startDate: startTimestamp,
          endDate: endTimestamp,
          notes: notes || undefined,
          isPrivate,
        })
        if (result.success) {
          onOpenChange(false)
          // Reset form
          setCityId(null)
          setStartDate('')
          setEndDate('')
          setNotes('')
          setIsPrivate(false)
        } else {
          setError(result.error || 'Failed to create visit')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editVisit ? 'Edit Visit' : 'Add Visit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* City Search */}
          <div className="space-y-2">
            <Label>City *</Label>
            <CitySearch value={cityId} onChange={setCityId} />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your visit..."
              rows={3}
            />
          </div>

          {/* Private Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private"
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
            />
            <Label htmlFor="private" className="cursor-pointer">
              Keep this visit private
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!cityId || !startDate || !endDate}
          >
            {editVisit ? 'Update Visit' : 'Add Visit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
