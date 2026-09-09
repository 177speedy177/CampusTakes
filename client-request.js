(() => {
  "use strict";

  const form = document.querySelector("#client-request-form");
  if (!form) return;

  const submitButton = document.querySelector("#client-request-submit");
  const status = document.querySelector("#client-request-status");
  const success = document.querySelector("#client-request-success");
  const state = { requestId: crypto.randomUUID(), ready: false, botToken: "", botWidget: null };

  const errorFor = (name) => form.querySelector(`[data-error-for="${name}"]`);

  function clearErrors() {
    form.querySelectorAll(".request-error").forEach((node) => { node.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach((node) => node.removeAttribute("aria-invalid"));
    status.textContent = "";
  }

  function showErrors(errors = {}) {
    let first = null;
    Object.entries(errors).forEach(([name, message]) => {
      const field = form.elements[name];
      const error = errorFor(name);
      if (error) error.textContent = message;
      const control = field?.length && !field.tagName ? field[0] : field;
      if (control) {
        control.setAttribute("aria-invalid", "true");
        first ||= control;
      }
    });
    first?.focus();
  }

  function values() {
    const data = new FormData(form);
    return {
      requestId: state.requestId,
      clientName: String(data.get("clientName") || "").trim(),
      workEmail: String(data.get("workEmail") || "").trim(),
      company: String(data.get("company") || "").trim(),
      targetDescription: String(data.get("targetDescription") || "").trim(),
      participantCount: String(data.get("participantCount") || "").trim(),
      incentiveBudget: String(data.get("incentiveBudget") || "").trim(),
      format: String(data.get("format") || "").trim(),
      timing: String(data.get("timing") || "").trim(),
      website: String(data.get("website") || ""),
      botChallenge: state.botToken,
    };
  }

  function localErrors(value) {
    const errors = {};
    if (value.clientName.length < 2) errors.clientName = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.workEmail)) errors.workEmail = "Enter a valid email.";
    if (value.company.length < 2) errors.company = "Enter your organization.";
    if (value.targetDescription.length < 10) errors.targetDescription = "Briefly describe the students you need.";
    const count = Number(value.participantCount);
    if (!Number.isInteger(count) || count < 1 || count > 1000) errors.participantCount = "Enter a participant count between 1 and 1,000.";
    if (!value.format) errors.format = "Choose a study format.";
    if (value.timing.length < 2) errors.timing = "Tell us when you need participants.";
    if (value.incentiveBudget && (!Number.isFinite(Number(value.incentiveBudget)) || Number(value.incentiveBudget) < 0 || Number(value.incentiveBudget) > 10000)) {
      errors.incentiveBudget = "Enter a per-participant incentive between $0 and $10,000, or leave it blank.";
    }
    return errors;
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? "Sending…" : "Send study details";
  }

  function resetChallenge() {
    state.botToken = "";
    if (state.botWidget !== null && window.turnstile) window.turnstile.reset(state.botWidget);
  }

  async function setupChallenge() {
    try {
      const response = await fetch("/api/bot-config", { headers: { Accept: "application/json" } });
      const config = await response.json();
      if (!response.ok || !config.enabled || !config.siteKey) {
        if (["localhost", "127.0.0.1"].includes(location.hostname)) { state.ready = true; return; }
        throw new Error("Security check unavailable.");
      }
      for (let attempt = 0; attempt < 80 && !window.turnstile; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!window.turnstile) throw new Error("Turnstile did not load.");
      state.botWidget = window.turnstile.render("#client-turnstile", {
        sitekey: config.siteKey,
        action: "student-intake",
        theme: "light",
        callback: (token) => { state.ready = true; state.botToken = token; status.textContent = ""; },
        "expired-callback": () => { state.botToken = ""; },
        "error-callback": () => { state.botToken = ""; },
      });
    } catch {
      status.textContent = "The security check could not load. Refresh the page or email hello@campustakes.com.";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    const value = values();
    const errors = localErrors(value);
    if (Object.keys(errors).length) return showErrors(errors);
    if (!state.ready || (state.botWidget !== null && !state.botToken)) {
      status.textContent = "Complete the security check and try again.";
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/study-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.fields) showErrors(result.fields);
        status.textContent = result.error || "We could not send your request. Please try again.";
        resetChallenge();
        return;
      }
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch {
      status.textContent = "We could not send your request. Your answers are still here—please try again or email hello@campustakes.com.";
      resetChallenge();
    } finally {
      setBusy(false);
    }
  });

  setupChallenge();
})();
