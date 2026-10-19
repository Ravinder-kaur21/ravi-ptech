"use client";

import { useEffect, useState } from "react";
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemAction,
} from "@/components/ai-elements/queue";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, CheckCircle2, XCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScheduledTask {
  id: string;
  title: string;
  description: string | null;
  taskType: string;
  status: string;
  scheduleType: string;
  intervalMinutes: string | null;
  runAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  priority: string;
  targetDriverName: string | null;
  targetLoadNumber: string | null;
  driverPrompt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Queued",
  in_progress: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function statusIcon(status: string) {
  if (status === "in_progress") return <Loader2 className="size-3.5 animate-spin" />;
  if (status === "completed") return <CheckCircle2 className="size-3.5 text-emerald-600" />;
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  if (status === "cancelled") return <XCircle className="size-3.5 text-muted-foreground" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s ?? "—";
  }
}

export function ScheduledTasksPanel() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/copilot/tasks");
      const data = await res.json();
      if (res.ok && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error("[SCHEDULED-TASKS] load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const cancel = async (id: string) => {
    setRunning((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/copilot/tasks?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("cancel failed");
      toast.success("Task cancelled");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to cancel");
    } finally {
      setRunning((s) => ({ ...s, [id]: false }));
    }
  };

  const remove = async (id: string) => {
    setRunning((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/copilot/tasks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast.success("Task deleted");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    } finally {
      setRunning((s) => ({ ...s, [id]: false }));
    }
  };

  const runNow = async (id: string) => {
    setRunning((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/cron/copilot-tasks`, { method: "POST" });
      if (!res.ok) throw new Error("tick failed");
      toast.success("Scheduler ticked");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to tick");
    } finally {
      setRunning((s) => ({ ...s, [id]: false }));
    }
  };

  const live = tasks.filter((t) => t.status === "scheduled" || t.status === "in_progress");
  const history = tasks.filter((t) => t.status === "completed" || t.status === "failed" || t.status === "cancelled");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-brand-ink">Scheduled Coworker Tasks</h3>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">
            The autonomous background loop runs every minute via Vercel Cron. {' '}
            {loading ? "Refreshing…" : `${tasks.length} total`}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => load()}
          disabled={loading}
          className="text-xs"
        >
          Refresh
        </Button>
      </div>

      <Queue>
        <QueueSection>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={live.length}
              label="Active"
              icon={<Clock className="size-4 text-brand-accent" />}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {live.length === 0 && (
                <QueueItem>
                  <span className="ml-2 text-[11px] text-brand-muted-soft">
                    No active scheduled tasks. Ask the copilot to "schedule a daily driver status check" to enqueue one.
                  </span>
                </QueueItem>
              )}
              {live.map((t) => (
                <QueueItem key={t.id} className={cn("flex flex-col gap-1 py-2")}>
                  <div className="flex items-center gap-2">
                    <QueueItemIndicator completed={false} />
                    {statusIcon(t.status)}
                    <QueueItemContent>{t.title}</QueueItemContent>
                    <QueueItemAction
                      onClick={() => runNow(t.id)}
                      disabled={running[t.id]}
                      aria-label="Run now"
                    >
                      <Send className="size-3" />
                    </QueueItemAction>
                    <QueueItemAction
                      onClick={() => cancel(t.id)}
                      disabled={running[t.id]}
                      aria-label="Cancel"
                    >
                      <XCircle className="size-3" />
                    </QueueItemAction>
                  </div>
                  <QueueItemDescription>
                    {t.taskType === "driver_task" && t.targetDriverName
                      ? `Driver: ${t.targetDriverName}`
                      : t.taskType}{" "}
                    · {t.scheduleType === "recurring" ? `every ${t.intervalMinutes ?? "?"} min` : "once"}
                    {" · next run: "}
                    {fmtDate(t.nextRunAt ?? t.runAt)}
                    {" · status: "}
                    {STATUS_LABEL[t.status] ?? t.status}
                  </QueueItemDescription>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>

        {history.length > 0 && (
          <QueueSection>
            <QueueSectionTrigger>
              <QueueSectionLabel
                count={history.length}
                label="History"
                icon={<CheckCircle2 className="size-4 text-emerald-600" />}
              />
            </QueueSectionTrigger>
            <QueueSectionContent>
              <QueueList>
                {history.map((t) => (
                  <QueueItem key={t.id}>
                    <div className="flex items-center gap-2">
                      <QueueItemIndicator completed={t.status === "completed"} />
                      {statusIcon(t.status)}
                      <QueueItemContent completed={t.status === "completed" || t.status === "cancelled"}>
                        {t.title}
                      </QueueItemContent>
                      <QueueItemAction
                        onClick={() => remove(t.id)}
                        disabled={running[t.id]}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3" />
                      </QueueItemAction>
                    </div>
                    <QueueItemDescription>
                      {STATUS_LABEL[t.status] ?? t.status} · last run {fmtDate(t.lastRunAt)}
                    </QueueItemDescription>
                  </QueueItem>
                ))}
              </QueueList>
            </QueueSectionContent>
          </QueueSection>
        )}
      </Queue>
    </div>
  );
}
