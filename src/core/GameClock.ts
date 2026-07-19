/**
 * Deterministic countdown clock driven externally by tick(dt).
 * Keeps gameplay timing independent of the render loop and testable.
 */
export class GameClock {
  private remaining = 0;
  private running = false;

  start(durationSeconds: number): void {
    this.remaining = durationSeconds;
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    if (this.remaining > 0) this.running = true;
  }

  stop(): void {
    this.running = false;
    this.remaining = 0;
  }

  /** returns true when the clock just expired on this tick */
  tick(deltaSeconds: number): boolean {
    if (!this.running || this.remaining <= 0) return false;
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    if (this.remaining === 0) {
      this.running = false;
      return true;
    }
    return false;
  }

  get remainingSeconds(): number {
    return this.remaining;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
