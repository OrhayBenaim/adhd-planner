import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { Task } from "@adhd-planner/types";
import { authClient } from "../lib/authClient";
import {
  readSelectedTaskId,
  resolveSelectedTask,
  writeSelectedTaskId,
} from "../lib/selectedTaskStorage";

/**
 * Selected task with AsyncStorage (cold start) + Convex userSessionState (sync).
 * On initial load: local interim, then server wins when the query resolves.
 *
 * The third element reports whether the stored selection has been restored yet,
 * so callers do not overwrite it with an auto-pick while it is still loading.
 */
export function usePersistedSelectedTask(
  tasks: Task[] | undefined,
): [Task | null, (task: Task | null) => void, boolean] {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const serverState = useQuery(
    api.userSessionState.get,
    userId ? {} : "skip",
  );
  const setSelectedTaskMutation = useMutation(api.userSessionState.setSelectedTask);

  const [selectedTask, setSelectedTaskState] = useState<Task | null>(null);
  const [localTaskId, setLocalTaskId] = useState<string | null | undefined>(
    undefined,
  );
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    setHydrated(false);
    setLocalTaskId(undefined);
    setSelectedTaskState(null);
    
    if (!userId) {
      return;
    }

    let mounted = true;
    readSelectedTaskId(userId)
      .then((id) => {
        if (mounted) setLocalTaskId(id);
      })
      .catch(() => {
        if (mounted) setLocalTaskId(null);
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || hydratedRef.current) return;
    if (tasks === undefined || localTaskId === undefined) return;

    if (serverState === undefined) {
      setSelectedTaskState(resolveSelectedTask(tasks, localTaskId));
      return;
    }

    const serverTask = resolveSelectedTask(tasks, serverState.selectedTaskId);
    setSelectedTaskState(serverTask);
    writeSelectedTaskId(userId, serverTask?._id ?? null).catch(() => {});
    hydratedRef.current = true;
    setHydrated(true);
  }, [userId, tasks, localTaskId, serverState]);

  const setSelectedTask = useCallback(
    (task: Task | null) => {
      setSelectedTaskState(task);
      if (!userId) return;

      const taskId = task?._id ?? null;
      writeSelectedTaskId(userId, taskId).catch(() => {});
      setSelectedTaskMutation({
        taskId: taskId as Id<"tasks"> | null,
      }).catch(() => {});
    },
    [userId, setSelectedTaskMutation],
  );

  return [selectedTask, setSelectedTask, hydrated];
}
