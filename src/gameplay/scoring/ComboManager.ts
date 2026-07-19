const COMBO_THRESHOLDS = [0, 2, 4, 6, 8]; // consecutive successes needed for x1..x5

export class ComboManager {
  private streakCount = 0;
  private best = 1;

  registerSuccess(): void {
    this.streakCount++;
    if (this.multiplier > this.best) this.best = this.multiplier;
  }

  registerFailure(): void {
    this.streakCount = 0;
  }

  reset(): void {
    this.streakCount = 0;
    this.best = 1;
  }

  get streak(): number {
    return this.streakCount;
  }

  /** x1 .. x5 */
  get multiplier(): number {
    let m = 1;
    for (let i = COMBO_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.streakCount >= COMBO_THRESHOLDS[i]) {
        m = i + 1;
        break;
      }
    }
    return m;
  }

  get bestMultiplier(): number {
    return this.best;
  }
}
