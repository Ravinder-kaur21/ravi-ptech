"use client"

import * as React from "react"
import { Volume2, VolumeX } from "lucide-react"
import { useSound } from "@/components/providers/sound-provider"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function SoundToggle() {
  const { isMuted, toggleMute } = useSound()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute audio feedback" : "Mute audio feedback"}
            className="h-9 w-9 rounded-full text-brand-muted-soft hover:bg-brand-cream-soft hover:text-brand-ink transition-colors"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-brand-muted-soft/60" />
            ) : (
              <Volume2 className="h-4 w-4 text-brand-muted-soft hover:text-brand-ink" />
            )}
          </Button>
        }
      />
      <TooltipContent side="bottom" className="text-xs">
        {isMuted ? "Unmute UI sounds (clicks, typing, dialogs)" : "Mute UI sounds"}
      </TooltipContent>
    </Tooltip>
  )
}
