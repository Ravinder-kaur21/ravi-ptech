"use client"

/**
 * SearchCommand — the global Cmd-K palette for the admin console.
 *
 * Opens via:
 *   - click on the search trigger in the site header
 *   - window event "admin:open-search"
 *   - keyboard shortcut Cmd/Ctrl + K (registered globally)
 *
 * Indexes: users (by email/name), workspaces (by name/slug), and
 * open appeals. Selecting an entry routes the browser to its detail
 * page; for users this is the /admin/users list filtered to the user
 * (we don't have a per-user admin detail page yet — Phase 2 work).
 */
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Building2,
  Inbox,
  Search,
  ChevronRight,
  Loader2,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"

type SearchResult = {
  users: { id: string; email: string; name: string }[]
  workspaces: { id: string; name: string; slug: string }[]
  appeals: { id: string; email: string; reason: string | null }[]
}

const EMPTY: SearchResult = { users: [], workspaces: [], appeals: [] }

export function SearchCommand() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [data, setData] = React.useState<SearchResult>(EMPTY)
  const [loading, setLoading] = React.useState(false)

  // Global Cmd/Ctrl + K + custom event
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    function onEvent() {
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("admin:open-search", onEvent as EventListener)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("admin:open-search", onEvent as EventListener)
    }
  }, [])

  // Debounced fetch
  React.useEffect(() => {
    if (!open) return
    if (!query.trim()) {
      setData(EMPTY)
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : EMPTY))
        .then((d) => setData(d))
        .catch(() => setData(EMPTY))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [query, open])

  function close() {
    setOpen(false)
    setQuery("")
  }

  function go(href: string) {
    close()
    router.push(href)
  }

  const hasResults =
    data.users.length > 0 ||
    data.workspaces.length > 0 ||
    data.appeals.length > 0

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        placeholder="Search users, workspaces, appeals…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-brand-muted-soft">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        ) : !query.trim() ? (
          <CommandEmpty>
            <div className="space-y-2 py-3 text-center">
              <Search className="mx-auto size-5 text-brand-muted-soft" />
              <p className="text-sm">Start typing to search.</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                <Kbd>↵</Kbd> to open · <Kbd>esc</Kbd> to close
              </p>
            </div>
          </CommandEmpty>
        ) : !hasResults ? (
          <CommandEmpty>No matches for &ldquo;{query}&rdquo;.</CommandEmpty>
        ) : null}

        {data.users.length > 0 && (
          <CommandGroup heading="Users">
            {data.users.map((u) => (
              <CommandItem
                key={u.id}
                value={`user-${u.id}-${u.email}`}
                onSelect={() => go(`/admin/users?search=${encodeURIComponent(u.email)}`)}
                className="cursor-pointer"
              >
                <Users className="size-4 text-brand-muted-soft" />
                <span className="flex flex-col">
                  <span className="text-sm">{u.name || u.email}</span>
                  {u.name && (
                    <span className="font-mono text-[10px] text-brand-muted-soft">
                      {u.email}
                    </span>
                  )}
                </span>
                <ChevronRight className="ml-auto size-4 text-brand-muted-soft" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data.workspaces.length > 0 && (
          <CommandGroup heading="Workspaces">
            {data.workspaces.map((w) => (
              <CommandItem
                key={w.id}
                value={`ws-${w.id}-${w.slug}`}
                onSelect={() => go(`/admin/workspaces?search=${encodeURIComponent(w.slug)}`)}
                className="cursor-pointer"
              >
                <Building2 className="size-4 text-brand-muted-soft" />
                <span className="flex flex-col">
                  <span className="text-sm">{w.name}</span>
                  <span className="font-mono text-[10px] text-brand-muted-soft">
                    /{w.slug}
                  </span>
                </span>
                <ChevronRight className="ml-auto size-4 text-brand-muted-soft" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {data.appeals.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Open appeals">
              {data.appeals.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`appeal-${a.id}-${a.email}`}
                  onSelect={() => go("/admin/appeals")}
                  className="cursor-pointer"
                >
                  <Inbox className="size-4 text-blue-600" />
                  <span className="flex flex-col">
                    <span className="text-sm">{a.email}</span>
                    {a.reason && (
                      <span className="line-clamp-1 text-[11px] text-brand-muted-soft">
                        {a.reason}
                      </span>
                    )}
                  </span>
                  <CommandShortcut>appeals</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
