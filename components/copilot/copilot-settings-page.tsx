"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  StackPanel,
  type StackPage,
  type StackRow,
  type StackSection,
} from "@/components/kokonutui/stack-panel";
import AvatarPicker from "@/components/kokonutui/avatar-picker";
import AIContextMeter from "@/components/kokonutui/ai-context-meter";
import {
  MuvxBot,
  type BotCoat,
  type BotMood,
} from "@/components/ai/muvx-bot";
import {
  ArrowLeft,
  Sparkles,
  Save,
  MessageSquare,
  Bot,
  ShieldAlert,
  Brain,
  History,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AVAILABLE_COATS: { id: BotCoat; label: string; color: string; desc: string }[] = [
  { id: "ink", label: "Obsidian Ink", color: "#141414", desc: "Classic enterprise obsidian monochrome" },
  { id: "cream", label: "Warm Cream", color: "#fff6ea", desc: "Warm editorial parchment paper" },
  { id: "peach", label: "Coral Peach", color: "#ffb199", desc: "Vibrant energetic dispatcher coral" },
  { id: "grove", label: "Forest Grove", color: "#163d36", desc: "Deep alpine evergreen terminal" },
  { id: "amber", label: "Golden Amber", color: "#b45309", desc: "Financial auditor golden amber" },
  { id: "emerald", label: "Emerald Green", color: "#047857", desc: "Fleet safety compliance emerald" },
  { id: "indigo", label: "Royal Indigo", color: "#1d4ed8", desc: "Strategic route planning indigo" },
  { id: "rose", label: "Velvet Rose", color: "#be123c", desc: "Executive governance crimson rose" },
];

export function CopilotSettingsPageClient() {
  const router = useRouter();

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Appearance & Persona
  const [coat, setCoat] = useState<BotCoat>("ink");
  const [previewMood, setPreviewMood] = useState<BotMood>("idle");
  const [autoCycleCoat, setAutoCycleCoat] = useState(false);
  const [avatarSeedName, setAvatarSeedName] = useState("Muvx Copilot");
  const [avatarVariant, setAvatarVariant] = useState(0);

  // Agency & Autonomous Mode
  const [allowAll, setAllowAll] = useState(false);
  const [maxSteps, setMaxSteps] = useState("12");
  const [proactiveHeartbeat, setProactiveHeartbeat] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");

  // Intelligence & Defaults
  const [defaultModel, setDefaultModel] = useState("gemini-2.5-flash");
  const [webSearchDefault, setWebSearchDefault] = useState(false);

  // Enterprise Memories
  const [memories, setMemories] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("fact");
  const [savingMemory, setSavingMemory] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load initial settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/copilot/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setCoat(data.settings.coat || "ink");
          setAutoCycleCoat(Boolean(data.settings.autoCycleCoat));
          setAllowAll(Boolean(data.settings.allowAllTools));
          setMaxSteps(String(data.settings.maxSteps || "12"));
          setProactiveHeartbeat(data.settings.proactiveHeartbeat ?? true);
          setCustomInstructions(data.settings.customInstructions || "");
          setDefaultModel(data.settings.defaultModel || "gemini-2.5-flash");
          setWebSearchDefault(Boolean(data.settings.webSearchDefault));
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMemories = async () => {
    try {
      const res = await fetch("/api/copilot/memory");
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (e) {
      console.error("Failed to load memories:", e);
    }
  };

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/copilot/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadMemories();
    loadLogs();
  }, []);

  // Save Settings
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/copilot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coat,
          autoCycleCoat,
          allowAllTools: allowAll,
          maxSteps: parseInt(maxSteps, 10) || 12,
          proactiveHeartbeat,
          customInstructions,
          defaultModel,
          webSearchDefault,
        }),
      });

      if (res.ok) {
        toast.success("Copilot settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (e) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  // Add memory
  const handleAddMemory = async () => {
    if (!newKey.trim() || !newContent.trim()) {
      toast.error("Key and content are required");
      return;
    }
    try {
      setSavingMemory(true);
      const res = await fetch("/api/copilot/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey.trim(),
          content: newContent.trim(),
          category: newCategory,
        }),
      });
      if (res.ok) {
        toast.success("Memory saved to Copilot knowledge graph");
        setNewKey("");
        setNewContent("");
        loadMemories();
      } else {
        toast.error("Failed to save memory");
      }
    } catch (e) {
      toast.error("Error adding memory");
    } finally {
      setSavingMemory(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/copilot/memory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Memory removed");
        setMemories((m) => m.filter((x) => x.id !== id));
      }
    } catch (e) {
      toast.error("Failed to delete memory");
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to clear your current conversation?")) return;
    try {
      const res = await fetch("/api/copilot/chats", { method: "DELETE" });
      if (res.ok) {
        toast.success("Conversation cleared");
        router.push("/copilot");
      }
    } catch (e) {
      toast.error("Failed to clear chat");
    }
  };

  // Current coat label
  const currentCoatObj = AVAILABLE_COATS.find((c) => c.id === coat) || AVAILABLE_COATS[0];

  // ─── Stack Panel Pages Configuration ──────────────────────────
  const stackPages = useMemo<Record<string, StackPage>>(() => {
    return {
      // ── Root Settings Directory ──
      root: {
        title: "Copilot Settings",
        sections: [
          {
            title: "Appearance & Persona",
            rows: [
              {
                id: "row-appearance",
                label: "Agent Persona & Colors",
                detail: currentCoatObj.label,
                to: "appearance",
              },
              {
                id: "row-autocycle",
                label: "Auto-Cycle Coat on Mood Changes",
                checked: autoCycleCoat,
                onSelect: () => setAutoCycleCoat(!autoCycleCoat),
              },
            ],
            footer: "Configure visual representation, avatar style, and live mood animations.",
          },
          {
            title: "Autonomous Agency",
            rows: [
              {
                id: "row-allowall",
                label: "Allow All Tools (Autonomous Mode)",
                detail: allowAll ? "Auto-Execute" : "Approval Gate",
                checked: allowAll,
                onSelect: () => setAllowAll(!allowAll),
              },
              {
                id: "row-proactive",
                label: "Proactive Dispatch Monitor",
                detail: proactiveHeartbeat ? "Active" : "Disabled",
                checked: proactiveHeartbeat,
                onSelect: () => setProactiveHeartbeat(!proactiveHeartbeat),
              },
              {
                id: "row-reasoning",
                label: "Max Reasoning Depth",
                detail: `${maxSteps} steps`,
                to: "reasoning",
              },
              {
                id: "row-instructions",
                label: "Custom Dispatch Instructions",
                detail: customInstructions ? "Configured" : "Default",
                to: "instructions",
              },
            ],
            footer:
              "When Allow All is enabled, Copilot executes safe read/write TMS tools autonomously without prompting for confirmation.",
          },
          {
            title: "Capacity & Intelligence",
            rows: [
              {
                id: "row-usage",
                label: "Context Window & Usage",
                detail: "AI Context Meter",
                to: "usage",
              },
              {
                id: "row-model",
                label: "Default Reasoning Engine",
                detail: defaultModel,
                to: "models",
              },
              {
                id: "row-websearch",
                label: "Default Web Grounding",
                checked: webSearchDefault,
                onSelect: () => setWebSearchDefault(!webSearchDefault),
              },
            ],
            footer: "Monitor token utilization, context window limits, and reasoning engine defaults.",
          },
          {
            title: "Memory & Governance",
            rows: [
              {
                id: "row-memory",
                label: "Enterprise Persistent Memory",
                detail: `${memories.length} entries`,
                to: "memory",
              },
              {
                id: "row-audit",
                label: "Tool Execution Audit Trail",
                detail: `${logs.length} logs`,
                to: "audit",
              },
              {
                id: "row-clear",
                label: "Clear Conversation History",
                detail: "Reset Chat",
                tone: "danger",
                onSelect: handleClearChat,
              },
            ],
            footer: "Manage learned dispatch policies, shipper contacts, and security audit traces.",
          },
        ],
      },

      // ── Appearance Page ──
      appearance: {
        title: "Appearance & Persona",
        sections: [
          {
            title: "Live Orb Animation Preview",
            customContent: (
              <div className="flex flex-col items-center justify-center py-4 bg-brand-cream/30 rounded-xl border border-brand-rule/60 my-2">
                <div className="mb-3">
                  <MuvxBot size="lg" coat={coat} mood={previewMood} />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  {(["idle", "thinking", "tool", "response"] as BotMood[]).map((m) => (
                    <Button
                      key={m}
                      size="xs"
                      variant={previewMood === m ? "default" : "outline"}
                      onClick={() => setPreviewMood(m)}
                      className={cn(
                        "text-[11px] h-6 px-2.5 capitalize",
                        previewMood === m
                          ? "bg-brand-ink text-brand-cream hover:bg-brand-ink"
                          : "border-brand-rule text-brand-ink hover:bg-brand-cream/60"
                      )}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-brand-muted-soft mt-2 font-mono">
                  Current Coat: <span className="text-brand-ink font-semibold">{currentCoatObj.label}</span>
                </p>
              </div>
            ),
          },
          {
            title: "KokonutUI Avatar & Morphing Face",
            customContent: (
              <div className="my-2">
                <AvatarPicker
                  defaultValue={{ displayName: avatarSeedName, variant: avatarVariant }}
                  onChange={(val) => {
                    setAvatarSeedName(val.displayName);
                    setAvatarVariant(val.variant);
                  }}
                  title="Copilot Persona Customizer"
                  description="Spin the avatar or tap to morph agent visual features."
                  submitLabel="Apply Persona"
                  onComplete={() => {
                    toast.success("Avatar persona applied to Copilot");
                  }}
                  className="max-w-full border-brand-rule bg-brand-card shadow-xs"
                />
              </div>
            ),
          },
          {
            title: "Select Orb Coat Color",
            rows: AVAILABLE_COATS.map((c) => ({
              id: `coat-${c.id}`,
              label: c.label,
              detail: c.desc,
              selected: coat === c.id,
              onSelect: () => {
                setCoat(c.id);
                toast.success(`Copilot coat set to ${c.label}`);
              },
            })),
            footer: "Changes to Copilot orb coat are saved and visible across the entire platform.",
          },
        ],
      },

      // ── Usage & Context Page ──
      usage: {
        title: "Usage & Context Meter",
        sections: [
          {
            title: "Live Token Capacity & Context Window",
            customContent: (
              <div className="my-3 flex flex-col items-center">
                <AIContextMeter
                  limit={1_000_000}
                  model="Gemini 2.5 Flash / Claude 3.7"
                  defaultOpen={true}
                  className="w-full max-w-full border-brand-rule bg-brand-card shadow-xs"
                  onCompact={() => {
                    toast.success("Context compacted into high-density semantic summary");
                  }}
                />
                <div className="mt-3 p-3 rounded-xl bg-brand-cream/40 border border-brand-rule/60 text-xs text-brand-ink/80 w-full space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-brand-muted-soft">Context Limit:</span>
                    <span className="font-semibold text-brand-ink">1,000,000 tokens</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-brand-muted-soft">Auto-Compaction:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">At 85% capacity</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-brand-muted-soft">Memory Efficiency:</span>
                    <span className="font-semibold text-brand-accent">Optimized for Long-Horizon Dispatch</span>
                  </div>
                </div>
              </div>
            ),
            footer: "The AI Context Meter visually rolls token consumption and auto-compacts before overflow.",
          },
        ],
      },

      // ── Max Reasoning Steps Page ──
      reasoning: {
        title: "Reasoning Depth Limit",
        sections: [
          {
            title: "Maximum Autonomous Iterations",
            rows: ["8", "12", "16", "24", "32"].map((steps) => ({
              id: `steps-${steps}`,
              label: `${steps} tool iterations`,
              detail: steps === "12" ? "Recommended" : steps === "32" ? "Deep Research" : undefined,
              selected: maxSteps === steps,
              onSelect: () => setMaxSteps(steps),
            })),
            footer:
              "Higher limits allow Copilot to perform multi-step workflows like auditing FMCSA, matching 50+ loads, and drafting driver task chains in a single turn.",
          },
        ],
      },

      // ── Custom Instructions Page ──
      instructions: {
        title: "Custom Dispatch Instructions",
        sections: [
          {
            title: "System Guidance for Muvx Copilot",
            customContent: (
              <div className="my-2 space-y-2">
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always negotiate $3.00/mile or higher on reefer loads. Verify driver CDL before assigning loads over 40,000 lbs. Be concise with rates."
                  className="min-h-[140px] text-xs font-mono bg-brand-cream/35 border-brand-rule text-brand-ink focus-visible:ring-brand-accent/60"
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-brand-ink text-brand-cream hover:bg-brand-ink/90 text-xs"
                >
                  <Save className="size-3.5 mr-1.5" />
                  Save Instructions
                </Button>
              </div>
            ),
            footer:
              "These rules are injected into Copilot's prompt on every turn to align with your fleet's operating policies.",
          },
        ],
      },

      // ── Reasoning Models Page ──
      models: {
        title: "Default Reasoning Engine",
        sections: [
          {
            title: "Choose Default Model",
            rows: [
              {
                id: "gemini-2.5-flash",
                label: "Google Gemini 2.5 Flash",
                detail: "Fastest • Recommended",
                selected: defaultModel === "gemini-2.5-flash",
                onSelect: () => setDefaultModel("gemini-2.5-flash"),
              },
              {
                id: "gemini-2.5-pro",
                label: "Google Gemini 2.5 Pro",
                detail: "Complex Planning",
                selected: defaultModel === "gemini-2.5-pro",
                onSelect: () => setDefaultModel("gemini-2.5-pro"),
              },
              {
                id: "claude-3-7-sonnet",
                label: "Anthropic Claude 3.7 Sonnet",
                detail: "High Nuance & Coding",
                selected: defaultModel === "claude-3-7-sonnet",
                onSelect: () => setDefaultModel("claude-3-7-sonnet"),
              },
              {
                id: "gpt-4o",
                label: "OpenAI GPT-4o",
                detail: "General Enterprise",
                selected: defaultModel === "gpt-4o",
                onSelect: () => setDefaultModel("gpt-4o"),
              },
              {
                id: "deepseek-ai/deepseek-v3",
                label: "DeepSeek V3",
                detail: "Ultra-Efficient",
                selected: defaultModel === "deepseek-ai/deepseek-v3",
                onSelect: () => setDefaultModel("deepseek-ai/deepseek-v3"),
              },
            ],
            footer: "You can also switch models on the fly directly inside the chat interface prompt bar.",
          },
        ],
      },

      // ── Persistent Memory Page ──
      memory: {
        title: "Enterprise Memory Store",
        sections: [
          {
            title: "Add New Memory Fact or Rule",
            customContent: (
              <div className="space-y-2 p-3 bg-brand-cream/35 rounded-xl border border-brand-rule/60 my-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      placeholder="Key (e.g. shipper_target_rate)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="h-8 text-xs bg-brand-card border-brand-rule"
                    />
                  </div>
                  <div>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="h-8 w-full rounded-md border border-brand-rule bg-brand-card px-2 text-xs text-brand-ink outline-none"
                    >
                      <option value="fact">Fact</option>
                      <option value="rule">Rule</option>
                      <option value="preference">Preference</option>
                      <option value="instruction">Instruction</option>
                    </select>
                  </div>
                </div>
                <Textarea
                  placeholder="Content (e.g. Acme Corp prefers morning delivery in Chicago, IL before 10 AM CST)"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[60px] text-xs bg-brand-card border-brand-rule"
                />
                <Button
                  size="xs"
                  onClick={handleAddMemory}
                  disabled={savingMemory}
                  className="w-full bg-brand-ink text-brand-cream hover:bg-brand-ink/90 text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  Save Memory
                </Button>
              </div>
            ),
          },
          {
            title: `Stored Memories (${memories.length})`,
            customContent: (
              <div className="space-y-2 my-2">
                {memories.length === 0 ? (
                  <p className="text-xs text-brand-muted-soft text-center py-4 font-mono">
                    No persistent memories stored yet. Copilot learns facts during conversation.
                  </p>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-brand-rule bg-brand-card/90 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-brand-ink font-mono text-[11px] truncate">
                            {m.key}
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 border-brand-rule">
                            {m.category || "fact"}
                          </Badge>
                        </div>
                        <p className="text-brand-muted-soft text-[11px] leading-relaxed break-words">
                          {m.content}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteMemory(m.id)}
                        className="size-6 text-brand-muted-soft hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ),
            footer: "Memories persist across sessions and guide Copilot's reasoning for all workspace members.",
          },
        ],
      },

      // ── Audit Logs Page ──
      audit: {
        title: "Tool Execution Audit Trail",
        sections: [
          {
            title: `Recent Copilot Tool Invocations (${logs.length})`,
            customContent: (
              <div className="space-y-1.5 my-2 max-h-[360px] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <p className="text-xs text-brand-muted-soft text-center py-4 font-mono">
                    No tool logs recorded yet.
                  </p>
                ) : (
                  logs.slice(0, 30).map((l, i) => (
                    <div
                      key={l.id || i}
                      className="p-2 rounded-lg border border-brand-rule bg-brand-card text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-brand-ink truncate">
                            {l.toolName}
                          </span>
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0",
                              l.status === "success" ? "bg-emerald-500" : "bg-amber-500"
                            )}
                          />
                        </div>
                        <p className="text-brand-muted-soft text-[10px] truncate">
                          {l.executionTimeMs ? `${l.executionTimeMs}ms` : "Instant"} •{" "}
                          {l.createdAt ? new Date(l.createdAt).toLocaleTimeString() : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          l.status === "success"
                            ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            : "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        )}
                      >
                        {l.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            ),
            footer: "Audit records ensure enterprise compliance with automated FMCSA and fleet actions.",
          },
        ],
      },
    };
  }, [
    coat,
    previewMood,
    autoCycleCoat,
    avatarSeedName,
    avatarVariant,
    allowAll,
    maxSteps,
    proactiveHeartbeat,
    customInstructions,
    defaultModel,
    webSearchDefault,
    memories,
    logs,
    saving,
    savingMemory,
    newKey,
    newContent,
    newCategory,
    currentCoatObj,
  ]);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto pb-20">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-mono"
          >
            <ArrowLeft className="size-3.5" />
            <span>Settings</span>
          </Link>
          <span className="text-brand-muted-soft">/</span>
          <span className="text-xs font-mono text-brand-ink font-medium">Copilot</span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/copilot">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-brand-rule bg-brand-card hover:bg-brand-cream/50 text-brand-ink"
            >
              <MessageSquare className="size-3.5 mr-1.5 text-brand-accent" />
              Open Copilot Chat
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs bg-brand-ink text-brand-cream hover:bg-brand-ink/90 shadow-2xs"
          >
            <Save className="size-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* ── Header Title with Live Orb representation ── */}
      <div className="flex items-start justify-between gap-4 border-b border-brand-rule pb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent shadow-2xs">
              <Sparkles className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
                AI <span className="italic text-brand-accent">Copilot</span> Settings
              </h1>
            </div>
          </div>
          <p className="text-sm text-brand-ink/80 max-w-2xl leading-relaxed">
            Personalize your dispatch assistant, appearance, automated approvals, and fleet memory.
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-2xl bg-brand-cream/35 border border-brand-rule shadow-2xs shrink-0">
          <MuvxBot size="sm" coat={coat} mood={previewMood} />
          <span className="mt-1 text-[10px] font-mono font-medium text-brand-muted-soft uppercase tracking-wider">
            {currentCoatObj.label}
          </span>
        </div>
      </div>

      {/* ── KokonutUI Stack Panel Navigation for Settings ── */}
      <div className="flex flex-col items-center">
        <StackPanel
          pages={stackPages}
          root="root"
          className="w-full max-w-2xl border-brand-rule shadow-sm bg-brand-card"
        />
      </div>
    </div>
  );
}
export default CopilotSettingsPageClient;
