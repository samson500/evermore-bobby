(function () {
  const LS = {
    users: "evermore_users",
    current: "evermore_connect_user",
    active: "evermore_account_active",
    balance: "evermore_balance",
    totalEarned: "evermore_total_earned",
    daily: "evermore_daily_earnings",
    withdrawals: "evermore_withdrawals",
    profileBank: "evermore_profile_bank",
    profilePersonal: "evermore_profile_personal",
    taskData: "evermore_task_data",
    codes: "evermore_activation_codes",
    config: "evermore_config",
    adminPass: "evermore_admin_password",
    activationDate: "evermore_activation_date",
  };

  const DEFAULT_CONFIG = {
    membershipPrice: 15000,
    paymentLink: "",
    telegramLink: "",
    whatsappLink: "",
    dailyCap: 14000,
    withdrawMin: 20000,
    taskDailyLimit: 2,
  };

  const DEFAULT_ADMIN_PASSWORD = "bobbymania";

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  let remoteConfig = {};

  function config() {
    return Object.assign({}, DEFAULT_CONFIG, get(LS.config, {}), remoteConfig);
  }

  function saveConfig(cfg) {
    set(LS.config, Object.assign({}, config(), cfg));
  }

  function applyRemoteConfig(data) {
    remoteConfig = data || {};
    set(LS.config, Object.assign({}, DEFAULT_CONFIG, get(LS.config, {}), remoteConfig));
  }

  function currentUser() {
    return get(LS.current, null);
  }

  function isActive() {
    return get(LS.active, false) === true || localStorage.getItem(LS.active) === "true";
  }

  function getBalance() {
    const b = Number(get(LS.balance, 0));
    return isNaN(b) ? 0 : b;
  }

  function setBalance(amount) {
    set(LS.balance, Math.max(0, Math.round(Number(amount) || 0)));
  }

  function getTotalEarned() {
    const t = Number(get(LS.totalEarned, 0));
    return isNaN(t) ? 0 : t;
  }

  function todayStr() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    return map.year + "-" + map.month + "-" + map.day;
  }

  function getDailyEarned() {
    const cfg = config();
    const d = get(LS.daily, { date: "", amount: 0 });
    const today = todayStr();
    return d.date === today ? Math.min(d.amount, cfg.dailyCap) : 0;
  }

  function dailyCapReached() {
    return getDailyEarned() >= config().dailyCap;
  }

  function addEarnings(amount) {
    const cfg = config();
    const today = todayStr();
    const d = get(LS.daily, { date: "", amount: 0 });
    const earnedToday = d.date === today ? d.amount : 0;
    const room = cfg.dailyCap - earnedToday;
    const credit = Math.max(0, Math.min(room, Number(amount) || 0));
    set(LS.daily, { date: today, amount: earnedToday + credit });
    const newBalance = getBalance() + credit;
    setBalance(newBalance);
    set(LS.totalEarned, getTotalEarned() + credit);
    return credit;
  }

  function getTaskData() {
    return get(LS.taskData, { date: "", completed: [], counts: {}, history: [] });
  }

  function recordTask(taskId, taskTitle, reward) {
    const today = todayStr();
    const t = getTaskData();
    if (t.date !== today) {
      t.date = today;
      t.completed = [];
      t.counts = {};
    }
    t.counts = t.counts || {};
    t.counts[taskId] = (t.counts[taskId] || 0) + 1;
    if (t.completed.indexOf(taskId) === -1) t.completed.push(taskId);
    t.history = t.history || [];
    t.history.unshift({
      task: taskTitle,
      reward: reward,
      time: new Date().toLocaleString("en-NG", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    t.history = t.history.slice(0, 20);
    set(LS.taskData, t);
  }

  function taskCountToday(taskId) {
    const t = getTaskData();
    const today = todayStr();
    if (t.date !== today) return 0;
    return (t.counts && t.counts[taskId]) || 0;
  }

  function taskDoneToday(taskId) {
    return taskCountToday(taskId) >= config().taskDailyLimit;
  }

  function getWithdrawals() {
    return get(LS.withdrawals, []);
  }

  function addWithdrawal(amount, method) {
    const w = getWithdrawals();
    w.unshift({
      amount: amount,
      method: method || "Bank transfer",
      status: "Pending",
      date: new Date().toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      time: new Date().toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    set(LS.withdrawals, w);
  }

  function getBank() {
    return get(LS.profileBank, {});
  }

  function getCodes() {
    const codes = get(LS.codes, []);
    return Array.isArray(codes) ? codes : [];
  }

  function formatNaira(n) {
    return "₦" + Number(n || 0).toLocaleString("en-NG");
  }

  var FEEDBACK_OK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
  var FEEDBACK_ERR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  function showToast(message, success, title) {
    const isErr = success === false;
    let modal = document.getElementById("gvFeedback");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "gvFeedback";
      modal.style.cssText =
        "display:none;position:fixed;inset:0;background:rgba(13,34,70,0.5);z-index:10000001;" +
        "align-items:center;justify-content:center;padding:20px;";
      modal.innerHTML =
        '<div style="width:100%;max-width:380px;background:#fff;border-radius:24px;padding:30px 24px 28px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
          '<div class="gvFeedbackIcon" style="width:70px;height:70px;border-radius:20px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;"></div>' +
          '<h3 class="gvFeedbackTitle" style="margin:0;font-family:Poppins,sans-serif;font-size:19px;font-weight:700;color:#0d2246;"></h3>' +
          '<p class="gvFeedbackMsg" style="font-size:13.5px;color:#4a534e;line-height:1.7;margin-top:8px;"></p>' +
          '<button type="button" class="gvFeedbackBtn" style="margin-top:18px;width:100%;border:none;border-radius:999px;padding:15px 24px;font-family:Poppins,sans-serif;font-weight:700;font-size:15px;color:#fff;background:linear-gradient(135deg,#183d8e,#0d2246);cursor:pointer;">OK</button>' +
        '</div>';
      modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.classList.contains("gvFeedbackBtn")) {
          modal.style.display = "none";
          clearTimeout(modal._t);
        }
      });
      document.body.appendChild(modal);
    }

    const icon = modal.querySelector(".gvFeedbackIcon");
    const titleEl = modal.querySelector(".gvFeedbackTitle");
    const msg = modal.querySelector(".gvFeedbackMsg");

    icon.innerHTML = isErr ? FEEDBACK_ERR_SVG : FEEDBACK_OK_SVG;
    icon.style.background = isErr ? "#fdecec" : "#e3f5ec";
    icon.style.color = isErr ? "#b3261e" : "#0f5a3c";
    titleEl.textContent = title || (isErr ? "Something went wrong" : "Success");
    msg.textContent = message;

    modal.style.display = "flex";
    clearTimeout(modal._t);
    modal._t = setTimeout(function () {
      modal.style.display = "none";
    }, 2800);
  }

  function initials(name) {
    if (!name) return "E";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0); })
      .join("")
      .toUpperCase();
  }

  function avatarColor(name) {
    const hues = [24, 61, 142, 63, 174, 122, 180, 80, 110];
    let h = 0;
    for (let i = 0; i < (name || "E").length; i++) {
      h = (h * 31 + (name.charCodeAt(i) || 0)) % hues.length;
    }
    return "hsl(" + hues[h] + ", 45%, 38%)";
  }

  window.Evermore = {
    LS: LS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    DEFAULT_ADMIN_PASSWORD: DEFAULT_ADMIN_PASSWORD,
    get: get,
    set: set,
    remove: remove,
    config: config,
    saveConfig: saveConfig,
    applyRemoteConfig: applyRemoteConfig,
    currentUser: currentUser,
    isActive: isActive,
    getBalance: getBalance,
    setBalance: setBalance,
    getTotalEarned: getTotalEarned,
    getDailyEarned: getDailyEarned,
    dailyCapReached: dailyCapReached,
    addEarnings: addEarnings,
    getTaskData: getTaskData,
    recordTask: recordTask,
    taskCountToday: taskCountToday,
    taskDoneToday: taskDoneToday,
    getWithdrawals: getWithdrawals,
    addWithdrawal: addWithdrawal,
    getBank: getBank,
    getCodes: getCodes,
    formatNaira: formatNaira,
    showToast: showToast,
    initials: initials,
    avatarColor: avatarColor,
  };
})();
