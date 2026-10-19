"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MuvxBot,
  type BotCoat,
  type BotMood,
} from "@/components/ai/muvx-bot"
import {
  Palette,
  Bot,
  Brain,
  History,
  ShieldCheck,
  Zap,
  Sparkles,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface CopilotSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSettingsSaved?: () => void
}

const AVAILABLE_COATS: { id: BotCoat; label: string; color: string; desc: string }[] = [
  { id: "ink", label: "Obsidian Ink", color: "#141414", desc: "Classic enterprise obsidian monochrome" },
  { id: "cream", label: "Warm Cream", color: "#fff6ea", desc: "Warm editorial parchment paper" },
  { id: "peach", label: "Coral Peach", color: "#ffb199", desc: "Vibrant energetic dispatcher coral" },
  { id: "grove", label: "Forest Grove", color: "#163d36", desc: "Deep alpine evergreen terminal" },
  { id: "amber", label: "Golden Amber", color: "#b45309", desc: "Financial auditor golden amber" },
  { id: "emerald", label: "Emerald Green", color: "#047857", desc: "Fleet safety compliance emerald" },
  { id: "indigo", label: "Royal Indigo", color: "#1d4ed8", desc: "Strategic route planning indigo" },
  { id: "rose", label: "Velvet Rose", color: "#be123c", desc: "Executive governance crimson rose" },
]

export function CopilotSettingsDialog({
  open,
  onOpenChange,
  onSettingsSaved,
}: CopilotSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("appearance")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Appearance
  const [coat, setCoat] = useState<BotCoat>("ink")
  const [previewMood, setPreviewMood] = useState<BotMood>("idle")
  const [autoCycleCoat, setAutoCycleCoat] = useState(false)

  // Autonomous Mode & Agency
  const [allowAll, setAllowAll] = useState(false)
  const [maxSteps, setMaxSteps] = useState("12")
  const [proactiveHeartbeat, setProactiveHeartbeat] = useState(true)
  const [customInstructions, setCustomInstructions] = useState("")

  // Memories
  const [memories, setMemories] = useState<any[]>([])
  const [newKey, setNewKey] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("fact")
  const [savingMemory, setSavingMemory] = useState(false)

  // Logs
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Load settings and memories when opened
  useEffect(() => {
    if (!open) return
    setLoading(true)

    Promise.all([
      fetch("/api/copilot/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) {
            setCoat(data.settings.coat || "ink")
            setAutoCycleCoat(Boolean(data.settings.autoCycleCoat))
            setAllowAll(Boolean(data.settings.allowAll))
            setMaxSteps(data.settings.maxSteps || "12")
            setProactiveHeartbeat(data.settings.proactiveHeartbeat ?? true)
            setCustomInstructions(data.settings.customInstructions || "")
          }
        }),
      fetch("/api/copilot/memory")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.memories)) {
            setMemories(data.memories)
          }
        }),
      fetch("/api/copilot/logs?limit=30")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.logs)) {
            setLogs(data.logs)
          }
        }),
    ])
      .catch((err) => {
        console.error("Error loading copilot settings:", err)
        toast.error("Failed to load settings")
      })
      .finally(() => setLoading(false))
  }, [open])

  const refreshLogs = () => {
    setLoadingLogs(true)
    fetch("/api/copilot/logs?limit=30")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.logs)) setLogs(data.logs)
      })
      .catch(() => toast.error("Could not refresh logs"))
      .finally(() => setLoadingLogs(false))
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/copilot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coat,
          autoCycleCoat,
          allowAll,
          maxSteps,
          proactiveHeartbeat,
          customInstructions,
        }),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      toast.success("Copilot configuration updated")
      onSettingsSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey.trim() || !newContent.trim()) {
      toast.error("Please provide both context key and content")
      return
    }
    setSavingMemory(true)
    try {
      const res = await fetch("/api/copilot/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey.trim(),
          content: newContent.trim(),
          category: newCategory,
        }),
      })
      const data = await res.json()
      if (data.memory) {
        setMemories((prev) => [data.memory, ...prev.filter((m) => m.id !== data.memory.id)])
        setNewKey("")
        setNewContent("")
        toast.success("Enterprise memory saved")
      }
    } catch {
      toast.error("Failed to save memory")
    } finally {
      setSavingMemory(false)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`/api/copilot/memory?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      setMemories((prev) => prev.filter((m) => m.id !== id))
      toast.success("Memory removed")
    } catch {
      toast.error("Failed to delete memory")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-brand-rule bg-brand-card">
        <DialogHeader className="p-6 pb-4 border-b border-brand-rule/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-brand-ink flex items-center justify-center text-brand-cream">
                <Bot className="size-4 text-brand-accent" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg font-semibold text-brand-ink">
                  Muvx Copilot Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-brand-muted-soft">
                  Configure visual coat themes, autonomous execution permissions, enterprise memory, and audit trails.
                </DialogDescription>
              </div>
            </div>
            {allowAll && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-mono uppercase tracking-wider">
                Autonomous Mode Active
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-brand-cream/60 p-1 mb-5 rounded-xl border border-brand-rule">
              <TabsTrigger value="appearance" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                <Palette className="size-3.5" />
                <span>Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="agency" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                <Zap className="size-3.5" />
                <span>Agency & Rules</span>
              </TabsTrigger>
              <TabsTrigger value="memory" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                <Brain className="size-3.5" />
                <span>Memory ({memories.length})</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
                <History className="size-3.5" />
                <span>Activity Logs</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: APPEARANCE */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Live Bot Preview Card */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-brand-cream/50 to-brand-card border border-brand-rule text-center">
                  <div className="relative mb-3">
                    <MuvxBot
                      size="lg"
                      coat={coat}
                      mood={previewMood}
                      className="transition-transform duration-300"
                    />
                  </div>
                  <span className="font-serif text-sm font-semibold text-brand-ink capitalize">
                    {AVAILABLE_COATS.find((c) => c.id === coat)?.label}
                  </span>
                  <span className="text-[11px] text-brand-muted-soft mt-0.5 max-w-[200px]">
                    {AVAILABLE_COATS.find((c) => c.id === coat)?.desc}
                  </span>

                  {/* Mood Test Buttons */}
                  <div className="flex items-center gap-1 mt-4 pt-3 border-t border-brand-rule/60 w-full justify-center">
                    {(["idle", "think", "tool", "stream", "happy"] as BotMood[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPreviewMood(m)}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded-full border transition-all capitalize font-mono",
                          previewMood === m
                            ? "bg-brand-ink text-brand-cream border-brand-ink"
                            : "bg-white/80 border-brand-rule text-brand-muted-soft hover:text-brand-ink"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coat Swatches Grid */}
                <div className="md:col-span-2 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-muted-soft font-mono">
                    Select Agent Color Coat
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {AVAILABLE_COATS.map((c) => {
                      const isSelected = coat === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCoat(c.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                            isSelected
                              ? "border-brand-ink bg-brand-cream/80 ring-1 ring-brand-ink/30 shadow-xs"
                              : "border-brand-rule bg-brand-card hover:border-brand-accent/40 hover:bg-brand-cream/30"
                          )}
                        >
                          <div
                            className="size-6 rounded-full shrink-0 border border-black/10 shadow-inner"
                            style={{ backgroundColor: c.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-brand-ink truncate">
                              {c.label}
                            </div>
                            <div className="text-[10px] text-brand-muted-soft line-clamp-1">
                              {c.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="size-4 text-brand-accent shrink-0 ml-auto" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="pt-3 border-t border-brand-rule flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-brand-ink">
                        Auto-cycle Sidebar Palette
                      </div>
                      <div className="text-[11px] text-brand-muted-soft">
                        Smoothly rotate through signature hues in the sidebar icon
                      </div>
                    </div>
                    <Switch
                      checked={autoCycleCoat}
                      onCheckedChange={setAutoCycleCoat}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: AGENCY & PERMISSIONS */}
            <TabsContent value="agency" className="space-y-5 mt-0">
              {/* Allow All / Autonomous Mode Card */}
              <div className="p-4 rounded-xl border border-brand-accent/30 bg-gradient-to-br from-brand-accent/5 to-transparent space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-brand-accent" />
                      <span className="text-sm font-semibold text-brand-ink">
                        Autonomous Execution Mode (&quot;Allow All&quot;)
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted-soft leading-relaxed max-w-xl">
                      When enabled, Muvx Copilot executes verified write operations (booking loads, dispatching trips, updating driver CDLs, creating invoices, logging expenses) autonomously without pausing to prompt the human dispatcher for confirmation cards.
                    </p>
                  </div>
                  <Switch
                    checked={allowAll}
                    onCheckedChange={setAllowAll}
                    className="shrink-0 mt-1"
                  />
                </div>
                {allowAll && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-mono">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>Autonomous execution enabled. All operational writes will proceed directly.</span>
                  </div>
                )}
              </div>

              {/* Execution Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-brand-rule bg-brand-card space-y-2">
                  <div className="text-xs font-medium text-brand-ink">
                    Max Agent Reasoning Steps
                  </div>
                  <div className="text-[11px] text-brand-muted-soft">
                    Upper bound on multi-tool subtask chains per user turn
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {["8", "12", "16", "24"].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setMaxSteps(step)}
                        className={cn(
                          "px-3 py-1 text-xs rounded-lg border font-mono transition-all",
                          maxSteps === step
                            ? "bg-brand-ink text-brand-cream border-brand-ink font-semibold"
                            : "bg-white border-brand-rule text-brand-muted-soft hover:text-brand-ink"
                        )}
                      >
                        {step} steps
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-brand-rule bg-brand-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-brand-ink">
                        Proactive Dispatch Heartbeat
                      </div>
                      <div className="text-[11px] text-brand-muted-soft">
                        Periodically evaluate fleet duty & expiring loads
                      </div>
                    </div>
                    <Switch
                      checked={proactiveHeartbeat}
                      onCheckedChange={setProactiveHeartbeat}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-brand-ink">
                  Custom Enterprise Operational Directives
                </label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always prioritize Werner logistics reefers for cold-chain lanes. Reject loads under $2.80 RPM. Always verify trailer inspection status before dispatch."
                  rows={3}
                  className="text-xs border-brand-rule bg-white focus:border-brand-accent"
                />
                <span className="text-[11px] text-brand-muted-soft">
                  These instructions are automatically injected into Copilot system prompt on every execution.
                </span>
              </div>
            </TabsContent>

            {/* TAB 3: ENTERPRISE MEMORY */}
            <TabsContent value="memory" className="space-y-4 mt-0">
              <div className="p-3.5 rounded-xl border border-brand-rule bg-brand-cream/30 space-y-3">
                <div className="text-xs font-semibold text-brand-ink font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="size-3.5 text-brand-accent" />
                  Save New Enterprise Fact or Driver Preference
                </div>
                <form onSubmit={handleAddMemory} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Context Key (e.g. driver_john_prefers)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <div className="sm:col-span-2 flex gap-2">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="text-xs rounded-md border border-brand-rule bg-white px-2 py-1 text-brand-ink"
                      >
                        <option value="fact">Company Fact</option>
                        <option value="driver_preference">Driver Preference</option>
                        <option value="lane_rule">Lane Rule</option>
                        <option value="customer_term">Customer Term</option>
                      </select>
                      <Button
                        type="submit"
                        disabled={savingMemory}
                        size="sm"
                        className="bg-brand-ink text-brand-cream hover:bg-brand-ink/90 text-xs shrink-0 ml-auto"
                      >
                        {savingMemory ? "Saving..." : "Add Context"}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Fact or rule details that Copilot will recall during operational decisions..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={2}
                    className="text-xs bg-white"
                  />
                </form>
              </div>

              {/* Memory Items List */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {memories.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-brand-rule text-xs text-brand-muted-soft">
                    No enterprise memories registered yet. Add driver preferences or operating rules above.
                  </div>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-brand-rule/80 bg-brand-card flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-brand-ink text-[11px]">
                            {m.key}
                          </span>
                          <span className="rounded bg-brand-cream/80 px-1.5 py-0.5 text-[9.5px] font-mono text-brand-muted-soft uppercase border border-brand-rule">
                            {m.category}
                          </span>
                        </div>
                        <p className="text-brand-ink/80 leading-relaxed text-[11.5px]">
                          {m.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(m.id)}
                        className="text-brand-muted-soft hover:text-rose-600 p-1 shrink-0"
                        title="Delete memory"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB 4: AUDIT LOGS */}
            <TabsContent value="logs" className="space-y-3 mt-0">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-brand-muted-soft font-mono">
                  Showing last {logs.length} agent operational events
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshLogs}
                  disabled={loadingLogs}
                  className="h-7 text-xs gap-1.5"
                >
                  <RefreshCw className={cn("size-3", loadingLogs && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              <div className="border border-brand-rule rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-brand-muted-soft">
                    No copilot activity logged yet. Tools executed in chat will record here.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-cream/60 border-b border-brand-rule text-[10px] uppercase font-mono text-brand-muted-soft">
                      <tr>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Tool</th>
                        <th className="py-2 px-3">Duration</th>
                        <th className="py-2 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-rule/60">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-brand-cream/20">
                          <td className="py-2 px-3">
                            {log.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600">
                                <CheckCircle2 className="size-3" />
                                ok
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-600">
                                <AlertCircle className="size-3" />
                                fail
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-brand-ink max-w-[200px] truncate">
                            {log.action}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-brand-muted-soft">
                            {log.toolName || "general"}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-brand-muted-soft">
                            {log.durationMs || "-"}
                          </td>
                          <td className="py-2 px-3 text-[10px] text-brand-muted-soft whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-brand-rule/60 bg-brand-card flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink/90 text-xs px-5"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
