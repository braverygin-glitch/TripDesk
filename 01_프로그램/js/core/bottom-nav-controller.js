window.BottomNavController = {
  initialized: false,
  lastScrollY: 0,
  ticking: false,
  hiddenReasons: new Set(),
  scrollThreshold: 10,
  revealAtTop: 12,

  nav() {
    return document.querySelector(".bottom-nav");
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.lastScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);

    window.addEventListener("scroll", () => this.onScroll(), { passive: true });
    window.addEventListener("resize", () => this.sync(), { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.lastScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
        this.show("visibility");
      }
    });

    this.sync();
  },

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;

    window.requestAnimationFrame(() => {
      const currentY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const delta = currentY - this.lastScrollY;

      if (document.body.classList.contains("modal-open")) {
        this.hide("modal");
      } else if (currentY <= this.revealAtTop) {
        this.show("scroll");
      } else if (Math.abs(delta) >= this.scrollThreshold) {
        if (delta > 0) {
          this.hide("scroll");
        } else {
          this.show("scroll");
        }
      }

      this.lastScrollY = currentY;
      this.ticking = false;
    });
  },

  hide(reason = "manual") {
    this.hiddenReasons.add(reason);
    this.sync();
  },

  show(reason = "manual") {
    this.hiddenReasons.delete(reason);

    // 모달이 열린 동안에는 다른 이유가 해제되어도 하단바를 표시하지 않습니다.
    if (document.body.classList.contains("modal-open")) {
      this.hiddenReasons.add("modal");
    }

    this.sync();
  },

  showAll() {
    this.hiddenReasons.clear();
    if (document.body.classList.contains("modal-open")) {
      this.hiddenReasons.add("modal");
    }
    this.sync();
  },

  sync() {
    const nav = this.nav();
    if (!nav) return;

    const shouldHide = this.hiddenReasons.size > 0;
    nav.classList.toggle("bottom-nav-hidden", shouldHide);
    nav.setAttribute("aria-hidden", shouldHide ? "true" : "false");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.BottomNavController.init();
});
