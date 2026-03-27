/**
 * TaskChecklist — Renders checklists for a task with interactive items.
 *
 * Supports boolean, numeric, and text input types.
 * Shows progress bar and completion percentage.
 * Required items are visually marked and enforced.
 */

import * as React from "react"
import {
  CheckCircle2, Circle, AlertTriangle, Hash, Type,
  ClipboardList, ChevronDown, ChevronUp,
} from "lucide-react"
import { Card, Button, Badge, Input } from "@/components/ui/core"
import { useAuth } from "@/hooks/useAuth"

interface ChecklistItem {
  id: number
  checklistId: number
  sortOrder: number
  label: string
  itemType: "boolean" | "numeric" | "text"
  isRequired: boolean
  booleanValue: boolean | null
  numericValue: string | null
  textValue: string | null
  numericUnit: string | null
  numericMin: string | null
  numericMax: string | null
  isCompleted: boolean
  completedAt: string | null
  completedByUserId: number | null
}

interface Checklist {
  id: number
  taskId: number
  title: string
  totalItems: number
  completedItems: number
  progress: number
  items: ChecklistItem[]
}

interface Props {
  taskId: number
  readOnly?: boolean
}

export function TaskChecklist({ taskId, readOnly = false }: Props) {
  const [checklists, setChecklists] = React.useState<Checklist[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedId, setExpandedId] = React.useState<number | null>(null)
  const { user } = useAuth()

  const fetchChecklists = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('turbine_auth_token')
      const res = await fetch(`/api/tasks/${taskId}/checklists`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setChecklists(data)
        if (data.length > 0 && expandedId === null) {
          setExpandedId(data[0].id)
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [taskId, expandedId])

  React.useEffect(() => { fetchChecklists() }, [fetchChecklists])

  const handleUpdateItem = async (
    checklistId: number,
    itemId: number,
    update: Record<string, unknown>,
  ) => {
    try {
      const token = localStorage.getItem('turbine_auth_token')
      await fetch(`/api/checklists/${checklistId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(update),
      })
      await fetchChecklists()
    } catch {
      // silent
    }
  }

  if (loading) return null
  if (checklists.length === 0) return null

  return (
    <Card className="p-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4 flex items-center gap-2">
        <ClipboardList className="w-3.5 h-3.5" /> QC Checklists
      </h3>

      <div className="space-y-3">
        {checklists.map((checklist) => {
          const isExpanded = expandedId === checklist.id
          return (
            <div key={checklist.id} className="rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                onClick={() => setExpandedId(isExpanded ? null : checklist.id)}
              >
                <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-foreground">{checklist.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          checklist.progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${checklist.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {checklist.completedItems}/{checklist.totalItems} ({checklist.progress}%)
                    </span>
                  </div>
                </div>
                {checklist.progress === 100 ? (
                  <Badge variant="success" className="text-[9px]">Complete</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px]">In Progress</Badge>
                )}
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="border-t border-border divide-y divide-border/50">
                  {checklist.items.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 flex items-start gap-3 ${
                        item.isCompleted ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      {/* Completion toggle (boolean items) */}
                      {item.itemType === 'boolean' && (
                        <button
                          type="button"
                          disabled={readOnly}
                          className="mt-0.5 flex-shrink-0"
                          onClick={() =>
                            handleUpdateItem(checklist.id, item.id, {
                              booleanValue: !item.isCompleted,
                              isCompleted: !item.isCompleted,
                            })
                          }
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>
                      )}

                      {/* Type icon for non-boolean */}
                      {item.itemType === 'numeric' && (
                        <Hash className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                      )}
                      {item.itemType === 'text' && (
                        <Type className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                      )}

                      {/* Label + input */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs ${item.isCompleted ? 'text-foreground/60 line-through' : 'text-foreground font-medium'}`}>
                            {item.label}
                          </span>
                          {item.isRequired && !item.isCompleted && (
                            <span className="text-[8px] font-bold uppercase text-red-500 bg-red-50 px-1 py-0.5 rounded">REQ</span>
                          )}
                        </div>

                        {/* Numeric input */}
                        {item.itemType === 'numeric' && !readOnly && !item.isCompleted && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={item.numericMin && item.numericMax ? `${item.numericMin} – ${item.numericMax}` : 'Enter value'}
                              className="h-7 text-xs w-32"
                              defaultValue={item.numericValue ?? ''}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value)
                                if (!isNaN(val)) {
                                  handleUpdateItem(checklist.id, item.id, {
                                    numericValue: val,
                                    isCompleted: true,
                                  })
                                }
                              }}
                            />
                            {item.numericUnit && (
                              <span className="text-[10px] text-muted-foreground">{item.numericUnit}</span>
                            )}
                            {item.numericMin && item.numericMax && (
                              <span className="text-[9px] text-muted-foreground">
                                Range: {item.numericMin}–{item.numericMax}
                              </span>
                            )}
                          </div>
                        )}
                        {item.itemType === 'numeric' && item.isCompleted && item.numericValue && (
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Recorded: {item.numericValue} {item.numericUnit ?? ''}
                          </p>
                        )}

                        {/* Text input */}
                        {item.itemType === 'text' && !readOnly && !item.isCompleted && (
                          <div className="mt-1.5">
                            <Input
                              type="text"
                              placeholder="Enter observation..."
                              className="h-7 text-xs"
                              defaultValue={item.textValue ?? ''}
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  handleUpdateItem(checklist.id, item.id, {
                                    textValue: e.target.value.trim(),
                                    isCompleted: true,
                                  })
                                }
                              }}
                            />
                          </div>
                        )}
                        {item.itemType === 'text' && item.isCompleted && item.textValue && (
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            "{item.textValue}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
