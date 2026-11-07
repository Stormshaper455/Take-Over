// Add your game features here.
// The white laptop screen is the element with id="game-screen".

/*
 * Game integration:
 * takeoverMeter.badAction(10);  // Increase takeover by 10 percentage points.
 * takeoverMeter.goodAction(10); // Decrease takeover by 10 percentage points.
 * takeoverMeter.set(0);         // Reset for a new game.
 * takeoverMeter.value;          // Read the current percentage.
 * Listen for "takeoverchange" on the meter for game-specific consequences.
 */
(() => {
  const meter = document.querySelector(".takeover-meter");
  if (!meter) return;

  const panel = meter.closest(".takeover");
  const fill = meter.querySelector(".takeover-fill");
  const valueText = meter.querySelector(".takeover-value");
  const status = panel.querySelector(".takeover-status");
  let value = 0;

  function set(nextValue) {
    if (typeof nextValue !== "number" || !Number.isFinite(nextValue)) return value;
    const previousValue = value;
    value = Math.max(0, Math.min(100, Math.round(nextValue)));
    const label = value === 100 ? "System taken over"
      : value >= 75 ? "Critical takeover risk"
      : value >= 40 ? "Takeover risk rising"
      : value > 0 ? "Takeover detected" : "System secure";
    const color = value >= 75 ? "#ff7d91" : value >= 40 ? "#ffd180" : "#7ce0bd";

    meter.setAttribute("aria-valuenow", String(value));
    meter.setAttribute("aria-valuetext", value + "% — " + label);
    fill.style.strokeDashoffset = String(100 - value);
    panel.style.setProperty("--takeover-color", color);
    valueText.textContent = value + "%";
    status.textContent = label;

    if (value !== previousValue) {
      meter.dispatchEvent(new CustomEvent("takeoverchange", {
        bubbles: true,
        detail: { value, previousValue }
      }));
    }
    return value;
  }

  function action(points, direction) {
    if (typeof points !== "number" || !Number.isFinite(points) || points < 0) return value;
    return set(value + direction * points);
  }

  window.takeoverMeter = Object.freeze({
    set,
    badAction: (points = 10) => action(points, 1),
    goodAction: (points = 10) => action(points, -1),
    get value() { return value; }
  });
  set(0);
})();
