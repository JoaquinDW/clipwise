/**
 * In-process job lanes, replacing BullMQ + Redis.
 *
 * Everything runs on the user's own machine, so the queue's job is to keep that
 * machine usable: imports (download + Whisper) run one at a time because Whisper
 * already saturates every core, and renders run two at a time because x264
 * leaves headroom while face detection waits on frame sampling.
 */

type Task = () => Promise<void>;

export class Lane {
  private running = 0;
  private readonly pending: Task[] = [];

  constructor(
    readonly name: string,
    private readonly concurrency: number
  ) {}

  /** Queue a task. Failures are the task's own business; the lane keeps going. */
  push(task: Task): void {
    this.pending.push(task);
    this.drain();
  }

  get size(): number {
    return this.running + this.pending.length;
  }

  private drain(): void {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const task = this.pending.shift()!;
      this.running++;
      task()
        .catch((err) => console.error(`[${this.name}] task failed:`, err))
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }
}
