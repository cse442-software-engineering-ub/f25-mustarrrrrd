// Lightweight toast/notification helper used across the app
// Usage: notify(message, 'success'|'error'|'info')
export default function notify(message, type = "info", opts = {}) {
  try {
    const id = `__notify_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    let container = document.getElementById("__notify_container");
    if (!container) {
      container = document.createElement("div");
      container.id = "__notify_container";
      container.style.position = "fixed";
      container.style.right = "20px";
      container.style.top = "20px";
      container.style.zIndex = 99999;
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";
      document.body.appendChild(container);
    }

    const el = document.createElement("div");
    el.id = id;
    el.textContent = message;
    el.style.padding = "10px 14px";
    el.style.borderRadius = "10px";
    el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
    el.style.maxWidth = "320px";
    el.style.fontSize = "14px";
    el.style.color = "#fff";
    el.style.opacity = "0";
    el.style.transition = "opacity 160ms ease, transform 200ms cubic-bezier(.2,.9,.2,1)";
    el.style.transform = "translateY(-6px)";

    if (type === "success") {
      el.style.background = "#16a34a"; // green
    } else if (type === "error") {
      el.style.background = "#dc2626"; // red
    } else {
      el.style.background = "#111827"; // default dark
    }

    container.appendChild(el);

    // trigger show
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    const ttl = opts.ttl ?? 4200;
    const hide = () => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      setTimeout(() => {
        try { container.removeChild(el); } catch (e) {}
        if (!container.hasChildNodes()) {
          try { container.parentNode.removeChild(container); } catch (e) {}
        }
      }, 220);
    };

    let timer = setTimeout(hide, ttl);
    el.addEventListener("mouseenter", () => { clearTimeout(timer); });
    el.addEventListener("mouseleave", () => { timer = setTimeout(hide, 1600); });

    return () => {
      clearTimeout(timer);
      hide();
    };
  } catch (err) {
    // Fallback to alert if DOM is not available (very rare)
    try { alert(message); } catch (e) { /* swallow */ }
  }
}

// A lightweight, promise-based confirm dialog rendered into the DOM.
// Returns a Promise<boolean> that resolves to true for confirm, false for cancel.
export function confirmDialog(message = "Are you sure?", opts = {}) {
  return new Promise((resolve) => {
    try {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.35)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = 100000;

      const box = document.createElement("div");
      box.style.background = "var(--card-bg, #fff)";
      box.style.color = "var(--text-primary, #111)";
      box.style.padding = "18px";
      box.style.borderRadius = "12px";
      box.style.minWidth = "320px";
      box.style.maxWidth = "90%";
      box.style.boxShadow = "0 10px 40px rgba(0,0,0,0.2)";
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.gap = "12px";

      const txt = document.createElement("div");
      txt.textContent = message;
      txt.style.fontSize = "15px";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "8px";

      const btnCancel = document.createElement("button");
      btnCancel.textContent = opts.cancelText || "Cancel";
      btnCancel.style.padding = "8px 12px";
      btnCancel.style.borderRadius = "8px";
      btnCancel.style.border = "1px solid var(--border-color,#e5e7eb)";
      btnCancel.style.background = "var(--card-bg,#fff)";
      btnCancel.style.cursor = "pointer";

      const btnOk = document.createElement("button");
      btnOk.textContent = opts.okText || "Delete";
      btnOk.style.padding = "8px 12px";
      btnOk.style.borderRadius = "8px";
      btnOk.style.border = "none";
      btnOk.style.background = opts.okColor || "#dc2626";
      btnOk.style.color = "#fff";
      btnOk.style.cursor = "pointer";

      actions.appendChild(btnCancel);
      actions.appendChild(btnOk);

      box.appendChild(txt);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function cleanup(result) {
        try { document.body.removeChild(overlay); } catch (e) {}
        resolve(Boolean(result));
      }

      btnCancel.addEventListener("click", () => cleanup(false));
      btnOk.addEventListener("click", () => cleanup(true));

      // keyboard support: Escape to cancel, Enter to confirm
      function onKey(e) {
        if (e.key === "Escape") cleanup(false);
        if (e.key === "Enter") cleanup(true);
      }
      document.addEventListener("keydown", onKey, { once: true });

    } catch (err) {
      // fallback to window.confirm
      try {
        const ok = window.confirm(message);
        resolve(Boolean(ok));
      } catch (e) {
        resolve(false);
      }
    }
  });
}
