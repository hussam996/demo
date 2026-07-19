interface TutorialStep {
  id: string;
  text: string;
}

/** Step-by-step first-level tutorial; one instruction at a time. */
export class TutorialOverlay {
  private el: HTMLElement;
  private steps: TutorialStep[] = [
    { id: 'container', text: '١) اضغط على كوب أو مخروط من الرف الأيسر 🥤' },
    { id: 'scoop', text: '٢) اضغط على حوض نكهة ليغرف المغراف سكوبًا 🍨' },
    { id: 'more', text: '٣) أكمل الطلب حسب البطاقة (نكهات، صوص، إضافات) 📋' },
    { id: 'deliver', text: '٤) اضغط الجرس الذهبي لتسليم الطلب 🔔' },
  ];
  private index = -1;
  private doneIds = new Set<string>();

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tutorial hidden';
    root.appendChild(this.el);
  }

  start(): void {
    this.index = 0;
    this.doneIds.clear();
    this.render();
  }

  /** advances when the matching action happens */
  notify(actionId: 'container' | 'scoop' | 'more' | 'deliver'): void {
    if (this.index < 0) return;
    this.doneIds.add(actionId);
    const current = this.steps[this.index];
    if (current && current.id === actionId) {
      this.index++;
      // step 3 ("more") auto-passes if the player already delivered
      if (this.steps[this.index]?.id === 'more') {
        // it completes on any further ingredient OR on delivery
      }
      this.render();
    } else if (actionId === 'deliver') {
      this.stop();
    }
  }

  private render(): void {
    if (this.index < 0 || this.index >= this.steps.length) {
      this.stop();
      return;
    }
    this.el.innerHTML = `<div class="tutorial-bubble">${this.steps[this.index].text}</div>`;
    this.el.classList.remove('hidden');
  }

  stop(): void {
    this.index = -1;
    this.el.classList.add('hidden');
  }

  get active(): boolean {
    return this.index >= 0;
  }

  dispose(): void {
    this.el.remove();
  }
}
