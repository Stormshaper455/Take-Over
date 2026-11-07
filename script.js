// TAKE OVER - a single-page cybersecurity awareness mini game.
// All events, emails, and tasks are simulated. No backend is required.
(() => {
  function getElement(id) {
    return document.getElementById(id);
  }
  const tasks = ["Employee onboarding", "Vendor invoice", "Organize files", "Daily backup", "End-of-day report"];
  const eventNames = { ddos: "DDoS traffic spike", email: "Suspicious email", login: "Login attempt" };
  const companyEmails = [
    { company: "BrightTech", domain: "brightech.com", fake: "brightech-helpdesk.net", people: ["payroll", "support", "operations"], subject: "Payrol update", body: "Hi, your weekly timesheet is ready for review in the employee portal. Thanks, the payroll team." },
    { company: "Northstar Office", domain: "northstaroffice.com", fake: "northstar-offlce.com", people: ["billing", "orders", "accounts"], subject: "Invoice confrimation", body: "Hello, your office supply invoice has been posted to your usual vendor dashboard. Please review when available." },
    { company: "BluePeak Cloud", domain: "bluepeakcloud.com", fake: "bluepeak-cloud-login.co", people: ["billing", "alerts", "support"], subject: "Monthly cloud usage report", body: "Your monthly cloud usage summery can be viewed in the company dashboard. Contact support if you have questions." }
  ];
  const logins = [
    { name: "Sarah Mitchell", location: "Atlanta, GA", device: "Office Laptop 02" },
    { name: "Jordan Lee", location: "Atlanta, GA", device: "Office Laptop 04" },
    { name: "Maya Chen", location: "Atlanta, GA", device: "Office Laptop 05" }
  ];
  const state = {
    playing: false,
    finished: false,
    endAt: 0,
    nextEventAt: Infinity,
    taskDone: [false, false, false, false, false],
    activeEvent: null,
    lockedUntil: 0,
    popupCount: 0,
    mistakeCount: 0,
    eventCount: 0
  };
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(items) {
    return items[rand(0, items.length - 1)];
  }

  // Quiet time between incidents, in seconds.
  const eventMinWait = 50;
  const eventMaxWait = 85;
  let feedbackTimer;

  // Takeover meter display and game controls.
  const meter = document.querySelector(".takeover-meter");
  const meterPanel = meter.closest(".takeover");
  const fill = meter.querySelector(".takeover-fill");
  const meterText = meter.querySelector(".takeover-value");
  const meterStatus = meterPanel.querySelector(".takeover-status");
  let meterValue = 0;
  function setMeter(value) {
    if (!Number.isFinite(value)) return meterValue;
    const previousValue = meterValue;
    meterValue = Math.min(100, Math.max(0, Math.round(value)));
    let label = "System secure";
    let color = "#7ce0bd";

    if (meterValue === 100) {
      label = "System taken over";
      color = "#ff7d91";
    } else if (meterValue >= 75) {
      label = "Critical takeover risk";
      color = "#ff7d91";
    } else if (meterValue >= 40) {
      label = "Takeover risk rising";
      color = "#ffd180";
    } else if (meterValue > 0) {
      label = "Takeover detected";
    }
    meter.setAttribute("aria-valuenow", String(meterValue));
    meter.setAttribute("aria-valuetext", `${meterValue}% — ${label}`);
    fill.style.strokeDashoffset = String(100 - meterValue);
    meterPanel.style.setProperty("--takeover-color", color);
    meterText.textContent = `${meterValue}%`;
    meterStatus.textContent = label;
    if (previousValue !== meterValue) {
      meter.dispatchEvent(new CustomEvent("takeoverchange", { bubbles: true, detail: { value: meterValue, previousValue } }));
    }
    return meterValue;
  }
  window.takeoverMeter = Object.freeze({
    set: setMeter,
    badAction: (points = 10) => setMeter(meterValue + points),
    goodAction: (points = 10) => setMeter(meterValue - points),
    get value() { return meterValue; }
  });

  function feedback(message, bad = false) {
    const toast = getElement("feedback-toast");
    toast.textContent = message;
    toast.classList.toggle("bad", bad);
    toast.classList.remove("hidden");
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
  }
  function addLog(message) {
    const item = document.createElement("li");
    item.textContent = message;
    getElement("activity-log").prepend(item);
    while (getElement("activity-log").children.length > 5) getElement("activity-log").lastElementChild.remove();
  }
  function openTab(tab) {
    if (!state.playing || state.finished || state.lockedUntil > Date.now() || state.popupCount > 0) return;
    const target = getElement(tab);
    if (!target || !target.classList.contains("app")) return;
    document.querySelectorAll(".app").forEach(app => app.classList.toggle("active", app.id === tab));
    document.querySelectorAll(".dock-tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    getElement("app-content").scrollTop = 0;
    const event = state.activeEvent;
    if (event && event.phase === "incoming" && event.tab === tab) openIncident(event);
  }
  document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => openTab(button.dataset.tab)));

  function updateTasks() {
    const done = state.taskDone.filter(Boolean).length;
    getElement("task-progress").textContent = `${done} / 5`;
    tasks.forEach((task, i) => {
      getElement("task-card-" + i).classList.toggle("done", state.taskDone[i]);
      getElement("task-state-" + i).textContent = state.taskDone[i] ? "COMPLETE" : "PENDING";
    });
    const firstPending = state.taskDone.findIndex(done => !done);
    getElement("side-objective").textContent = firstPending === -1 ? "All tasks completed" : tasks[firstPending];
    getElement("side-detail").textContent = firstPending === -1 ? "You finished the workday." : "Switch apps when you need more information.";
    const prepared = state.taskDone.slice(0, 4).filter(Boolean).length;
    getElement("report-count").textContent = `${prepared} of 4 ready`;
    getElement("report-bar").style.width = `${prepared * 25}%`;
    getElement("report-badge").textContent = prepared === 4 ? "READY TO SUBMIT" : "NOT READY";
    getElement("report-badge").classList.toggle("ready", prepared === 4);
    getElement("report-help").textContent = prepared === 4 ? "All work verified. Submit your final report to finish your shift." : "Complete onboarding, the invoice, file sorting, and the backup first.";
    getElement("finish-report").disabled = prepared !== 4 || state.taskDone[4];
    if (done === 5) finishGame(true);
  }
  function finishTask(index) {
    if (!state.playing || state.finished || state.taskDone[index]) return;
    state.taskDone[index] = true;
    addLog(`Completed: ${tasks[index]}`);
    feedback(`${tasks[index]} completed!`);
    updateTasks();
  }
  getElement("finish-onboarding").addEventListener("click", () => {
    if (getElement("access-role").value !== "Marketing") return feedback("Check Maya Chen's department in Company Info.", true);
    getElement("access-role").disabled = true;
    getElement("finish-onboarding").disabled = true;
    finishTask(0);
  });
  getElement("finish-invoice").addEventListener("click", () => {
    if (getElement("vendor-domain").value !== "northstaroffice.com") return feedback("That is not Northstar Office's verified domain.", true);
    getElement("vendor-domain").disabled = true;
    getElement("finish-invoice").disabled = true;
    finishTask(1);
  });
  getElement("finish-files").addEventListener("click", () => {
    const correct = ["Finance", "Marketing", "HR"];
    if (!correct.every((folder, index) => getElement("file-folder-" + index).value === folder)) return feedback("One or more files are in the wrong folder.", true);
    correct.forEach((_, index) => getElement("file-folder-" + index).disabled = true);
    getElement("finish-files").disabled = true;
    finishTask(2);
  });
  getElement("finish-backup").addEventListener("click", () => {
    if (getElement("backup-choice").value !== "Employee Records") return feedback("Select Employee Records for the daily backup.", true);
    getElement("backup-result").textContent = "✓ Employee records backup completed successfully.";
    getElement("backup-choice").disabled = true;
    getElement("finish-backup").disabled = true;
    finishTask(3);
  });
  getElement("finish-report").addEventListener("click", () => {
    if (state.taskDone.slice(0, 4).every(Boolean)) finishTask(4);
  });

  function randomEmail() {
    const company = pick(companyEmails);
    const legit = Math.random() < 0.45;
    const name = pick(company.people);
    const domain = legit ? company.domain : company.fake;
    const scamSubject = pick(["URGENT: Accont verification required!", "Unpaid invoce - respond now", "Final notce: password reset"]);
    const scamBody = pick([
      "ACTION REQUIERED: Your company account will be suspended in 20 minutes. Enter your password at our outside verification link immediatly.",
      "Please confrim your bank details and login password at the attached site or your next paymant will be held.",
      "We detected an unexpected charge! Downlaod the attached tool and sign in to reverse this payment."
    ]);
    return { from: `${name}@${domain}`, subject: legit ? company.subject : scamSubject, body: legit ? company.body : scamBody, legit };
  }
  function randomLogin() {
    const employee = pick(logins);
    const legit = Math.random() < 0.45;
    return {
      name: employee.name,
      location: legit ? employee.location : pick(["Unknown location", "Unverified remote region", "Outside approved office"]),
      device: legit ? employee.device : pick(["Unknown Android", "Unrecognized Device", "Personal Laptop 99"]),
      legit
    };
  }
  function renderNetwork() {
    const box = getElement("network-alerts");
    const event = state.activeEvent;
    box.replaceChildren();
    if (!event || event.type !== "ddos") { box.innerHTML = '<div class="empty-state">No abnormal traffic detected.</div>'; getElement("network-deadline").textContent = "CLEAR"; return; }
    for (let i = 0; i < event.count; i++) {
      const row = document.createElement("div");
      row.className = "network-row" + (event.flushed.includes(i) ? " flushed" : "");
      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `⚠ Traffic spike #${i + 1}`;
      const sub = document.createElement("small");
      sub.textContent = event.flushed.includes(i) ? "Rate limit applied" : `Burst of requests — stream ${i + 1}`;
      details.append(title, sub);
      const button = document.createElement("button");
      button.className = "btn " + (event.flushed.includes(i) ? "btn-success" : "btn-danger");
      button.textContent = event.flushed.includes(i) ? "Flushed ✓" : "Flush rate limit";
      button.disabled = event.flushed.includes(i);
      button.addEventListener("click", () => flushTraffic(i));
      row.append(details, button);
      box.append(row);
    }
  }
  function renderEmail() {
    const event = state.activeEvent;
    getElement("email-empty").classList.toggle("hidden", !!event && event.type === "email");
    getElement("email-message").classList.toggle("hidden", !event || event.type !== "email");
    if (!event || event.type !== "email") return;
    getElement("email-from").textContent = event.message.from;
    getElement("email-subject").textContent = event.message.subject;
    getElement("email-body").textContent = event.message.body;
  }
  function renderLogin() {
    const event = state.activeEvent;
    getElement("login-empty").classList.toggle("hidden", !!event && event.type === "login");
    getElement("login-message").classList.toggle("hidden", !event || event.type !== "login");
    if (!event || event.type !== "login") return;
    getElement("login-name").textContent = event.message.name;
    getElement("login-location").textContent = event.message.location;
    getElement("login-device").textContent = event.message.device;
    getElement("login-time").textContent = getElement("game-clock").textContent;
  }
  function scheduleNextEvent() {
    // Start a new break after the incident or its penalty has ended.
    state.nextEventAt = Date.now() + rand(eventMinWait, eventMaxWait) * 1000;
  }
  function refreshEventStatus() {
    const event = state.activeEvent;
    const label = getElement("incident-status");
    label.classList.toggle("warning", !!event || state.popupCount > 0 || state.lockedUntil > Date.now());
    let message = "No active threats";
    if (event) {
      message = eventNames[event.type];
    } else if (state.popupCount > 0) {
      message = "Security popups active";
    } else if (state.lockedUntil > Date.now()) {
      message = "System locked";
    }
    label.innerHTML = `<span class="status-dot"></span>${message}`;
  }
  function beginIncident(type) {
    if (!state.playing || state.finished || state.activeEvent || state.popupCount || state.lockedUntil > Date.now()) return;
    const event = { type, tab: { ddos: "network", email: "email", login: "security" }[type], phase: "incoming", deadline: Date.now() + 10000 };
    if (type === "ddos") { event.count = rand(5, 8); event.flushed = []; }
    if (type === "email") event.message = randomEmail();
    if (type === "login") event.message = randomLogin();
    state.activeEvent = event;
    state.eventCount++;
    getElement("event-toast-title").textContent = { ddos: "DDoS ATTACK DETECTED", email: "NEW EMAIL — CHECK IT", login: "SUSPICIOUS LOGIN" }[type];
    getElement("event-toast-text").textContent = `Open ${event.tab.toUpperCase()} within 10 seconds`;
    getElement("event-toast").classList.remove("hidden");
    addLog(`Incident: ${eventNames[type]}`);
    renderNetwork(); renderEmail(); renderLogin(); refreshEventStatus();
    // If the player is already in the right app, the alert is opened automatically.
    if (getElement(event.tab).classList.contains("active")) openIncident(event);
  }
  function openIncident(event) {
    if (event !== state.activeEvent || event.phase !== "incoming") return;
    event.phase = "responding";
    if (event.type === "email") event.deadline = Date.now() + 20000;
    if (event.type === "login") event.deadline = Date.now() + 15000;
    // The original 10-second DDoS response deadline is kept until the first flush.
    getElement("event-toast").classList.add("hidden");
    refreshEventStatus();
  }
  getElement("event-toast").addEventListener("click", () => {
    const event = state.activeEvent;
    if (event) openTab(event.tab);
  });
  function resolveIncident(message, good) {
    const event = state.activeEvent;
    if (!event) return;
    state.activeEvent = null;
    getElement("event-toast").classList.add("hidden");
    if (good) window.takeoverMeter.goodAction(6);
    addLog(message);
    renderNetwork(); renderEmail(); renderLogin(); refreshEventStatus();
    if (state.popupCount === 0 && state.lockedUntil <= Date.now()) scheduleNextEvent();
  }
  function flushTraffic(index) {
    const event = state.activeEvent;
    if (!state.playing || !event || event.type !== "ddos" || event.phase !== "responding" || event.flushed.includes(index) || Date.now() >= event.deadline) return;
    event.flushed.push(index);
    if (event.flushed.length === 1) event.deadline = Date.now() + 22000;
    renderNetwork();
    if (event.flushed.length === event.count) { resolveIncident("Blocked DDoS traffic", true); feedback("All rate limits flushed. Network secured!"); }
  }
  function answerEmail(approve) {
    const event = state.activeEvent;
    if (!state.playing || !event || event.type !== "email" || event.phase !== "responding" || Date.now() >= event.deadline) return;
    const correct = approve === event.message.legit;
    resolveIncident(correct ? "Email checked correctly" : "Failed email verification", correct);
    if (correct) feedback("Correct! You verified the sender.");
    else { window.takeoverMeter.badAction(18); state.mistakeCount++; createErrorPopups(); feedback("Incorrect email decision! Close the popups.", true); }
  }
  getElement("approve-email").addEventListener("click", () => answerEmail(true));
  getElement("deny-email").addEventListener("click", () => answerEmail(false));
  function answerLogin(approve) {
    const event = state.activeEvent;
    if (!state.playing || !event || event.type !== "login" || event.phase !== "responding" || Date.now() >= event.deadline) return;
    const correct = approve === event.message.legit;
    resolveIncident(correct ? "Login reviewed correctly" : "Wrong login decision", correct);
    if (correct) feedback("Correct login decision!");
    else { state.mistakeCount++; window.takeoverMeter.badAction(12); lockComputer(); feedback("Incorrect login decision. Computer locked for 6 seconds.", true); }
  }
  getElement("approve-login").addEventListener("click", () => answerLogin(true));
  getElement("block-login").addEventListener("click", () => answerLogin(false));
  getElement("approve-login").disabled = false;

  function createErrorPopups() {
    const layer = getElement("popup-layer");
    layer.replaceChildren();
    const coords = [[5,14],[37,8],[64,25],[12,42],[50,43],[25,66],[62,70]];
    state.popupCount = 7;
    layer.classList.remove("hidden");
    coords.forEach(([left, top], i) => {
      const popup = document.createElement("div");
      popup.className = "error-popup";
      popup.style.left = `${left}%`;
      popup.style.top = `${top}%`;
      popup.style.zIndex = String(i + 1);
      const heading = document.createElement("div");
      heading.className = "popup-top";
      const name = document.createElement("span");
      name.textContent = `⚠ SECURITY BREACH #${i + 1}`;
      const close = document.createElement("button");
      close.textContent = "✕";
      close.setAttribute("aria-label", `Close security popup ${i + 1}`);
      close.addEventListener("click", () => {
        popup.remove();
        state.popupCount--;
        if (state.popupCount === 0) { layer.classList.add("hidden"); scheduleNextEvent(); refreshEventStatus(); feedback("Popups cleared. Get back to work!"); }
      });
      heading.append(name, close);
      const description = document.createElement("p");
      description.textContent = "Your inbox was compromised. Close this warning to regain control.";
      popup.append(heading, description);
      layer.append(popup);
    });
    refreshEventStatus();
  }
  function lockComputer() {
    state.lockedUntil = Date.now() + 6000;
    getElement("lock-layer").classList.remove("hidden");
    refreshEventStatus();
  }
  function failIncident() {
    const event = state.activeEvent;
    if (!event) return;
    const type = event.type;
    state.mistakeCount++;
    resolveIncident(`Missed ${eventNames[type]}`, false);
    if (type === "email") { window.takeoverMeter.badAction(18); createErrorPopups(); feedback("Email ignored or timed out! Clear the popups.", true); }
    else { window.takeoverMeter.badAction(12); lockComputer(); feedback("Security event timed out. Controls locked for 6 seconds.", true); }
  }
  function tick() {
    if (!state.playing || state.finished) return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((state.endAt - now) / 1000));
    getElement("countdown").textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
    const minutes = Math.min(240, Math.floor((420 - remaining) * 240 / 420));
    const hour = 1 + Math.floor(minutes / 60);
    getElement("game-clock").textContent = `${hour}:${String(minutes % 60).padStart(2, "0")} PM`;
    if (remaining === 0) { finishGame(false); return; }
    if (state.lockedUntil > now) {
      getElement("lock-seconds").textContent = String(Math.ceil((state.lockedUntil - now) / 1000));
      return;
    }
    if (state.lockedUntil !== 0) {
      state.lockedUntil = 0;
      getElement("lock-layer").classList.add("hidden");
      refreshEventStatus();
      scheduleNextEvent();
    }
    if (state.popupCount > 0) return;
    const event = state.activeEvent;
    if (event) {
      const seconds = Math.max(0, Math.ceil((event.deadline - now) / 1000));
      if (event.phase === "incoming") getElement("toast-time").textContent = `${seconds}s`;
      if (event.type === "email") getElement("email-deadline").textContent = event.phase === "incoming" ? "OPEN EMAIL" : `${seconds}s left`;
      if (event.type === "login") getElement("login-deadline").textContent = event.phase === "incoming" ? "OPEN ALERT" : `${seconds}s left`;
      if (event.type === "ddos") getElement("network-deadline").textContent = `${seconds}s left`;
      if (now >= event.deadline) failIncident();
    } else if (now >= state.nextEventAt) beginIncident(pick(["ddos", "email", "login"]));
  }
  function finishGame(won) {
    if (state.finished) return;
    state.finished = true;
    getElement("event-toast").classList.add("hidden");
    getElement("popup-layer").classList.add("hidden");
    getElement("lock-layer").classList.add("hidden");
    getElement("end-layer").classList.remove("hidden");
    getElement("end-title").textContent = won ? "Shift complete. You win!" : "5:00 PM. You're out of time.";
    getElement("end-description").textContent = won ? "You finished all five assignments before 5 PM while protecting your workspace. Great job!" : "You still had unfinished assignments when the workday ended. Try again and watch those distractions.";
    getElement("end-tasks").textContent = `${state.taskDone.filter(Boolean).length} / 5 tasks`;
    getElement("end-takeover").textContent = `${meterValue}% takeover`;
  }
  function startGame() {
    state.playing = true;
    state.endAt = Date.now() + 420000;
    scheduleNextEvent();
    getElement("start-layer").classList.add("hidden");
    addLog("Shift started at 1:00 PM");
    updateTasks();
    tick();
  }
  getElement("start-game").addEventListener("click", startGame);
  getElement("play-again").addEventListener("click", () => window.location.reload());
  setMeter(0);
  updateTasks();
  setInterval(tick, 200);
  // Optional test/demo hooks, only available when opening the page with ?test=1.
  if (new URLSearchParams(window.location.search).has("test")) {
    window.takeoverTest = {
      trigger: beginIncident,
      getState: () => state,
      expireIncident: () => { if (state.activeEvent) { state.activeEvent.deadline = Date.now() - 1; tick(); } },
      expireGame: () => { state.endAt = Date.now() - 1; tick(); },
      finishLock: () => { state.lockedUntil = Date.now() - 1; tick(); }
    };
  }
})();

