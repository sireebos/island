/**
 * Kali Island - Spring Animation Controller
 */

export class SpringAnimator {
  constructor(capsuleElement) {
    this.capsule = capsuleElement;
  }

  expand() {
    this.capsule.classList.remove('minimized');
    this.capsule.classList.add('pulse');
    setTimeout(() => {
      this.capsule.classList.remove('pulse');
      this.capsule.classList.add('expanded');
    }, 50);
  }

  collapse() {
    this.capsule.classList.remove('expanded');
  }

  minimize() {
    this.capsule.classList.remove('expanded');
    this.capsule.classList.add('minimized');
  }

  restore() {
    this.capsule.classList.remove('minimized');
  }

  pulse() {
    this.capsule.classList.add('pulse');
    setTimeout(() => this.capsule.classList.remove('pulse'), 320);
  }
}
