import _ from "lodash";
import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "idle",
  "pending",
  "complete",
  "error",
]);
export const TaskSchema = z.object({
  id: z.string(),
  status: TaskStatusSchema,
  timestamp: z.number(),
  numTokens: z.number(),
  metadata: z.object({}).optional(),
});
export const TaskQueueStatisticsSchema = z.object({
  pending: z.number(),
  idle: z.number(),
  complete: z.number(),
  error: z.number(),
  currentQueueLength: z.number(),
  rateLimits: z.object({
    requests: z.number(),
    tokens: z.number(),
    recentTasks: z.number(),
  }),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskQueueStatistics = z.infer<typeof TaskQueueStatisticsSchema>;
type Processor = ({ task }: { task: Task }) => Promise<Task>;

const sleep = async ({ forMs }: { forMs: number }) => {
  await new Promise((resolve) => setTimeout(resolve, forMs));
};

//NOTE:
// currently we reset the timestamp on start, success and failure,
// this could lead to keeping primitives longer in the "1 minute" window than we should
export const TaskQueue = ({
  sleepTimeInMs,
  gcTimeInMs,
  maxTokensPerMinute,
  maxRequestsPerMinute,
}: {
  sleepTimeInMs: number;
  gcTimeInMs: number;
  maxTokensPerMinute: number;
  maxRequestsPerMinute: number;
}) => {
  const queue: { t: Task; p: Processor }[] = [];
  let running = false;
  let successGcd = 0;
  let errorGcd = 0;

  const hasWorkToDo = (): boolean => {
    return !!queue.find((t) => t.t.status === "idle");
  };

  const calcRateLimitsForLastMinute = () => {
    const recents = queue
      .filter((u) => u.t.timestamp > Date.now() - 60 * 1000)
      .filter(
        (u) =>
          u.t.status === "complete" ||
          u.t.status === "error" ||
          u.t.status === "pending"
      );

    const requests = recents.length;
    const tokens = recents.reduce((acc, u) => acc + u.t.numTokens, 0);
    return { requests, tokens, recentTasks: recents.length };
  };

  const isRatelimited = (): boolean => {
    const { requests, tokens } = calcRateLimitsForLastMinute();
    return tokens > maxTokensPerMinute || requests > maxRequestsPerMinute;
  };

  const safeToRemove = (t: Task): boolean => {
    return (
      (t.status === "complete" || t.status === "error") &&
      t.timestamp + gcTimeInMs < Date.now()
    );
  };

  const gc = () => {
    const indicesToRemove = queue
      .map(({ t }, idx) => ({ gc: safeToRemove(t), status: t.status, idx }))
      .filter(({ gc }) => gc)
      .map(({ status, idx }) => {
        if (status === "complete") successGcd++;
        if (status === "error") errorGcd++;
        return idx;
      });
    // Sort the indices in descending order so that we can remove them from the end of the array first
    indicesToRemove.sort((a, b) => b - a);

    // Remove the elements at the specified indices from the array
    for (const i of indicesToRemove) {
      queue.splice(i, 1);
    }
  };
  const run = async () => {
    if (running) return;
    running = true;
    while (hasWorkToDo()) {
      if (isRatelimited()) {
        await sleep({ forMs: sleepTimeInMs });
        continue;
      }
      gc();
      const candidates = queue.filter((t) => t.t.status === "idle");
      const task = _.minBy(candidates, (c) => c.t.timestamp);
      if (!task) continue;
      const { t, p } = task;
      //we can inplace modify primitives bcs they are dereferenced
      t.timestamp = Date.now();
      t.status = "pending";

      (async () => {
        try {
          //we derefer the task before passing it to the processor
          const rt = await p({ task: { ...t } });
          //so we can modify it inplace
          t.status = rt.status;
          t.numTokens = rt.numTokens;
          t.timestamp = Date.now();
          t.metadata = rt.metadata; // this is not dereferenced
        } catch {
          t.status = "error";
          t.timestamp = Date.now();
        }
      })();
    }
    running = false;
  };

  /**
   * Adds the primitives with a processor to the queue, and resolves the promise when all primitives are complete.
   * The primitives getting dereferenced so the queue can modify them inplace.
   *
   * NOTE:
   * we dereference in high level only, so nested fields like meta, or arrays are not dereferenced!
   * This is generally not an issue, the code only runs on Tasks, and they are not nested.
   */
  const pushTasks = ({
    tasks,
    processor,
    checkIntervalInMs = 200,
  }: {
    tasks: Task[];
    processor: Processor;
    checkIntervalInMs?: number;
  }) => {
    //dereference each task
    const tasksCopy = tasks.map((t) => ({ t: { ...t }, p: processor }));
    const promise: Promise<{
      tasks: Task[];
      completed: number;
      errors: number;
    }> = new Promise((resolve) => {
      const interval = setInterval(() => {
        if (
          tasksCopy.find(
            (t) => t.t.status === "pending" || t.t.status === "idle"
          ) === undefined
        ) {
          clearInterval(interval);
          const err = tasksCopy.filter((t) => t.t.status === "error").length;
          const comp = tasksCopy.filter(
            (t) => t.t.status === "complete"
          ).length;
          resolve({
            tasks: tasksCopy.map((t) => ({ ...t.t })),
            errors: err,
            completed: comp,
          });
        }
      }, checkIntervalInMs);
    });
    tasksCopy.forEach((t) => queue.push(t));
    run();
    return promise;
  };

  const getStats = (): TaskQueueStatistics => {
    return {
      pending: queue.filter((t) => t.t.status === "pending").length,
      idle: queue.filter((t) => t.t.status === "idle").length,
      complete:
        queue.filter((t) => t.t.status === "complete").length + successGcd,
      error: queue.filter((t) => t.t.status === "error").length + errorGcd,
      currentQueueLength: queue.length,
      rateLimits: calcRateLimitsForLastMinute(),
    };
  };

  return { pushTasks, getStats };
};
