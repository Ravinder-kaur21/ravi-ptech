"use client"

import * as React from "react"
import { sounds } from "@/lib/sound-effects"

interface SoundContextType {
  isMuted: boolean
  toggleMute: () => void
  setMuted: (muted: boolean) => void
  playTrackpadClick: () => void
  playKeypress: () => void
  playPulse: () => void
  playSuccess: () => void
  playBell: () => void
  playPop: () => void
}

const SoundContext = React.createContext<SoundContextType>({
  isMuted: false,
  toggleMute: () => {},
  setMuted: () => {},
  playTrackpadClick: () => {},
  playKeypress: () => {},
  playPulse: () => {},
  playSuccess: () => {},
  playBell: () => {},
  playPop: () => {},
})

export function useSound() {
  return React.useContext(SoundContext)
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMutedState] = React.useState<boolean>(false)

  React.useEffect(() => {
    setIsMutedState(sounds.getMuted())

    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted: boolean }>
      setIsMutedState(customEvent.detail.isMuted)
    }

    window.addEventListener("muvx-sound-mute-change", handleMuteChange)
    return () => {
      window.removeEventListener("muvx-sound-mute-change", handleMuteChange)
    }
  }, [])

  const toggleMute = React.useCallback(() => {
    const next = sounds.toggleMute()
    setIsMutedState(next)
  }, [])

  const setMuted = React.useCallback((muted: boolean) => {
    sounds.setMuted(muted)
    setIsMutedState(muted)
  }, [])

  // ─── GLOBAL AUDIO LISTENERS ───
  React.useEffect(() => {
    // 1. Click Listener for Trackpad Click on buttons & interactive elements
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Find clickable target
      const clickable = target.closest(
        'button, [role="button"], a[href], input[type="submit"], input[type="button"], [data-slot="button"], [data-clickable="true"]'
      ) as HTMLElement | null

      if (!clickable) return

      // Don't click on disabled elements
      if (
        clickable.hasAttribute("disabled") ||
        clickable.getAttribute("aria-disabled") === "true" ||
        clickable.dataset.noSound === "true"
      ) {
        return
      }

      // 1A. Switch / Checkbox toggle clicks
      const isSwitch =
        clickable.getAttribute("role") === "switch" ||
        clickable.getAttribute("role") === "checkbox" ||
        (clickable.tagName === "INPUT" && (clickable as HTMLInputElement).type === "checkbox")

      if (isSwitch) {
        const isChecked =
          clickable.getAttribute("aria-checked") === "true" ||
          clickable.getAttribute("data-state") === "checked" ||
          (clickable as HTMLInputElement).checked
        sounds.playToggle(!isChecked)
        return
      }

      // 1B. Dialog triggers — suppress click so the rich spatial dialog whoosh plays cleanly
      const isDialogTrigger =
        clickable.hasAttribute("data-dialog-trigger") ||
        clickable.getAttribute("aria-haspopup") === "dialog" ||
        clickable.closest('[data-slot="dialog-trigger"]')

      if (isDialogTrigger) {
        return
      }

      sounds.playTrackpadClick()
    }

    // 2. Keydown Listener for typing sound in inputs and textareas
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable

      if (!isInput) return

      // Skip non-typing modifier keys
      if (
        [
          "Shift",
          "Control",
          "Alt",
          "Meta",
          "CapsLock",
          "Escape",
          "Tab",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      ) {
        return
      }

      sounds.playKeypress()
    }

    // 3. MutationObserver for Dialog / Sheet / Modal opens (Soft Pulse)
    let lastDialogPulse = 0
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          for (const node of Array.from(m.addedNodes)) {
            if (node instanceof HTMLElement) {
              const isDialog =
                node.getAttribute("role") === "dialog" ||
                node.getAttribute("role") === "alertdialog" ||
                node.querySelector?.('[role="dialog"]') ||
                node.querySelector?.('[role="alertdialog"]')

              if (isDialog) {
                const now = Date.now()
                if (now - lastDialogPulse > 300) {
                  lastDialogPulse = now
                  sounds.playPulse()
                }
              }
            }
          }
        } else if (m.type === "attributes" && m.attributeName === "data-state") {
          const target = m.target as HTMLElement
          if (
            (target.getAttribute("role") === "dialog" ||
              target.getAttribute("role") === "alertdialog") &&
            target.getAttribute("data-state") === "open"
          ) {
            const now = Date.now()
            if (now - lastDialogPulse > 300) {
              lastDialogPulse = now
              sounds.playPulse()
            }
          }
        }
      }
    })

    document.addEventListener("click", handleClick, { capture: true, passive: true })
    document.addEventListener("keydown", handleKeyDown, { capture: true, passive: true })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    })

    return () => {
      document.removeEventListener("click", handleClick, { capture: true })
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
      observer.disconnect()
    }
  }, [])

  const contextValue = React.useMemo<SoundContextType>(
    () => ({
      isMuted,
      toggleMute,
      setMuted,
      playTrackpadClick: () => sounds.playTrackpadClick(),
      playKeypress: () => sounds.playKeypress(),
      playPulse: () => sounds.playPulse(),
      playSuccess: () => sounds.playSuccess(),
      playBell: () => sounds.playBell(),
      playPop: () => sounds.playPop(),
    }),
    [isMuted, toggleMute, setMuted]
  )

  return (
    <SoundContext.Provider value={contextValue}>
      {children}
    </SoundContext.Provider>
  )
}
