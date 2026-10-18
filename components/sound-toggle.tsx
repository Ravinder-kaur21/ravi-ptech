"use client"

import * as React from "react"
import { Volume2, VolumeX, Sparkles, Keyboard, Bell, CheckCircle2, Play, Radio } from "lucide-react"
import { useSound } from "@/components/providers/sound-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { sounds } from "@/lib/sound-effects"

export function SoundToggle() {
  const {
    isMuted,
    toggleMute,
    playTrackpadClick,
    playKeypress,
    playPulse,
    playSuccess,
    playBell,
    playPop,
  } = useSound()

  const [testInput, setTestInput] = React.useState("")
  const [lastTested, setLastTested] = React.useState<string | null>(null)

  const triggerTest = (name: string, fn: () => void) => {
    fn()
    setLastTested(name)
    setTimeout(() => setLastTested((prev) => (prev === name ? null : prev)), 800)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={isMuted ? "Audio muted" : "Audio active"}
            className="h-9 w-9 rounded-full border border-brand-rule bg-brand-card hover:bg-brand-cream-soft text-brand-muted-soft hover:text-brand-ink transition-colors flex items-center justify-center relative cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-brand-muted-soft/60" />
            ) : (
              <Volume2 className="h-4 w-4 text-brand-muted-soft hover:text-brand-ink" />
            )}
            <span
              className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${
                isMuted ? "bg-zinc-400" : "bg-emerald-500 animate-pulse"
              }`}
            />
          </button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-4 rounded-2xl border-brand-rule bg-brand-card shadow-xl space-y-4"
      >
        {/* Header & Mute Switch */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-rule">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold text-brand-ink">
                UI Sound Effects
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  isMuted
                    ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                }`}
              >
                {isMuted ? "MUTED" : "LIVE"}
              </span>
            </div>
            <p className="text-[11px] text-brand-muted-soft mt-0.5">
              Procedural Web Audio (Zero-latency)
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="h-7 text-xs rounded-full px-2.5 border-brand-rule hover:border-brand-accent/40"
          >
            {isMuted ? "Unmute" : "Mute"}
          </Button>
        </div>

        {/* Audio Soundboard / Tester */}
        <div className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-brand-muted-soft font-semibold">
            Interactive Sound Tester
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerTest("click", playTrackpadClick)}
              className={`h-8 justify-start text-[11px] font-normal border-brand-rule/80 ${
                lastTested === "click" ? "border-brand-accent bg-brand-accent-tint" : ""
              }`}
            >
              <Radio className="size-3 mr-1.5 text-brand-accent" />
              <span>Trackpad Click</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerTest("pulse", playPulse)}
              className={`h-8 justify-start text-[11px] font-normal border-brand-rule/80 ${
                lastTested === "pulse" ? "border-brand-accent bg-brand-accent-tint" : ""
              }`}
            >
              <Sparkles className="size-3 mr-1.5 text-indigo-500" />
              <span>Dialog Pulse</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerTest("success", playSuccess)}
              className={`h-8 justify-start text-[11px] font-normal border-brand-rule/80 ${
                lastTested === "success" ? "border-brand-accent bg-brand-accent-tint" : ""
              }`}
            >
              <CheckCircle2 className="size-3 mr-1.5 text-emerald-600" />
              <span>Success Chime</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerTest("bell", playBell)}
              className={`h-8 justify-start text-[11px] font-normal border-brand-rule/80 ${
                lastTested === "bell" ? "border-brand-accent bg-brand-accent-tint" : ""
              }`}
            >
              <Bell className="size-3 mr-1.5 text-amber-500" />
              <span>Bell Alert</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerTest("confirm", () => sounds.playConfirm())}
              className={`h-8 justify-start text-[11px] font-normal border-brand-rule/80 ${
                lastTested === "confirm" ? "border-brand-accent bg-brand-accent-tint" : ""
              }`}
            >
              <Sparkles className="size-3 mr-1.5 text-sky-500" />
              <span>Glass Confirm</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerTest("toggle", () => sounds.playToggle(true))}
              className={`h-8 justify-start text-[11px] font-normal border-brand-rule/80 ${
                lastTested === "toggle" ? "border-brand-accent bg-brand-accent-tint" : ""
              }`}
            >
              <Radio className="size-3 mr-1.5 text-violet-500" />
              <span>Toggle Switch</span>
            </Button>
          </div>
        </div>

        {/* Live Typing Test Box */}
        <div className="space-y-1.5 pt-1 border-t border-brand-rule/60">
          <label
            htmlFor="sound-test-typing"
            className="text-[11px] font-mono text-brand-muted-soft flex items-center gap-1.5"
          >
            <Keyboard className="size-3 text-brand-ink" />
            <span>Type here to test soft keystroke sound:</span>
          </label>
          <Input
            id="sound-test-typing"
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Type anything on your keyboard..."
            className="h-8 text-xs border-brand-rule bg-brand-cream/10 focus-visible:ring-brand-accent font-sans"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
