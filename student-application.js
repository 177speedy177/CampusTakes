(() => {
  const form = document.querySelector("#student-application");
  if (!form) return;

  const state = {
    email: { token: "", contact: "" },
    sms: { token: "", contact: "" },
    requestId: crypto.randomUUID(),
    botProof: "",
    botChallenge: "",
    botWidget: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const emailInput = $("#school-email");
  const phoneInput = $("#mobile-phone");
  const universityInput = $("#university");
  const submitButton = $("#application-submit");
  const formAlert = $("#form-alert");
  const otherInstitution = $("#other-institution-wrap");
  const acquisitionDetailWrap = $("#acquisition-detail-wrap");
  const acquisitionDetailInput = $("#acquisition-detail");
  const acquisitionDetailLabel = $("#acquisition-detail-label");
  const botStatus = $("#bot-status");
  const sections = $$(".form-section", form);
  const stepNames = ["Contact details", "Your studies", "Study preferences", "Confirm and apply"];
  let currentStep = 0;
  const progress = document.createElement("div");
  progress.className = "application-progress";
  const stepLabel = document.createElement("p");
  stepLabel.setAttribute("role", "status");
  const track = document.createElement("div");
  track.className = "progress-track";
  track.setAttribute("aria-hidden", "true");
  sections.forEach(() => track.append(document.createElement("span")));
  progress.append(stepLabel, track);
  const actions = document.createElement("div");
  actions.className = "application-actions";
  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "application-back";
  backButton.textContent = "Back";
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "application-next";
  nextButton.textContent = "Continue";
  actions.append(backButton, nextButton);

  function showStep(index, focus = true) {
    currentStep = index;
    sections.forEach((section, i) => { section.hidden = i !== index; });
    stepLabel.textContent = `Step ${index + 1} of ${sections.length} · ${stepNames[index]}`;
    [...track.children].forEach((bar, i) => bar.classList.toggle("complete", i <= index));
    backButton.hidden = index === 0;
    nextButton.hidden = index === sections.length - 1;
    if (focus) {
      $("legend", sections[index]).focus({ preventScroll: true });
      progress.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }

  function validateSection(index) {
    const invalid = $$("input:not([data-code-input]), select", sections[index]).find(input => !input.checkValidity());
    if (invalid) {
      showStep(index, false);
      invalid.reportValidity();
      return false;
    }
    if (index === 0 && (!state.email.token || !state.sms.token)) {
      showErrors(Object.assign(new Error("Verify your school email and phone number to continue."), {
        fields: {
          ...(!state.email.token ? { schoolEmail: "Send a code to your school email, then enter it here." } : {}),
          ...(!state.sms.token ? { mobilePhone: "Send a code to your phone, then enter it here." } : {}),
        },
      }));
      return false;
    }
    if (index === 2 && !selectedValues("availability").length) {
      showErrors(Object.assign(new Error("Choose at least one time you are usually available."), {
        fields: { availability: "Select at least one time." },
      }));
      return false;
    }
    return true;
  }

  function advanceStep() {
    clearErrors();
    expireProofs();
    if (validateSection(currentStep)) showStep(currentStep + 1);
  }
  nextButton.addEventListener("click", advanceStep);
  backButton.addEventListener("click", () => {
    clearErrors();
    showStep(currentStep - 1);
  });

  async function waitForTurnstile() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (window.turnstile) return window.turnstile;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Security check could not load. Please refresh the page.");
  }

  async function initializeBotCheck() {
    try {
      const response = await fetch("/api/bot-config", { headers: { Accept: "application/json" } });
      const config = await response.json();
      if (!response.ok || !config.enabled || !config.siteKey) {
        if (["localhost", "127.0.0.1"].includes(location.hostname)) return;
        throw new Error("Applications are temporarily unavailable while the security check is configured.");
      }
      const turnstile = await waitForTurnstile();
      botStatus.textContent = "Complete the security check before requesting a code.";
      state.botWidget = turnstile.render("#turnstile-widget", {
        sitekey: config.siteKey,
        action: "student-intake",
        theme: "light",
        size: matchMedia("(max-width: 420px)").matches ? "compact" : "normal",
        callback(token) {
          state.botChallenge = token;
          botStatus.textContent = "Security check complete.";
          botStatus.className = "verification-status verified";
        },
        "expired-callback"() {
          state.botChallenge = "";
          botStatus.textContent = "Security check expired. Please complete it again.";
          botStatus.className = "verification-status error";
        },
        "error-callback"() {
          state.botChallenge = "";
          botStatus.textContent = "Security check could not load. Please refresh the page.";
          botStatus.className = "verification-status error";
        },
      });
    } catch (error) {
      botStatus.textContent = error.message;
      botStatus.className = "verification-status error";
      $$('[data-action="send-code"]').forEach(button => { button.disabled = true; });
    }
  }

  initializeBotCheck();

  function resetBotChallenge() {
    state.botChallenge = "";
    if (state.botWidget !== null && window.turnstile) window.turnstile.reset(state.botWidget);
  }

  const normalizeEmail = (value) => value.trim().toLowerCase();
  const normalizePhone = (value) => {
    const compact = value.trim().replace(/[\s().-]/g, "");
    if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return "";
  };
  const isEduEmail = (value) => /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.edu$/i.test(normalizeEmail(value));

  function setBusy(button, busy, busyLabel) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyLabel : button.dataset.label;
  }

  function setStatus(channel, kind, message) {
    const status = $(`[data-verification-status="${channel}"]`);
    status.className = `verification-status ${kind || ""}`.trim();
    status.textContent = message;
  }

  function invalidate(channel) {
    state[channel] = { token: "", contact: "" };
    const input = channel === "email" ? emailInput : phoneInput;
    input.removeAttribute("readonly");
    input.closest(".verification-block").classList.remove("is-verified");
    $(`[data-code-row="${channel}"]`).hidden = true;
    setStatus(channel, "", channel === "email" ? "Not verified yet." : "Not verified yet.");
  }

  function expireProofs() {
    for (const channel of ["email", "sms"]) {
      if (state[channel].token && Date.now() >= state[channel].expiresAt) {
        invalidate(channel);
        setStatus(channel, "error", "Verification expired. Request a new code; your answers are preserved.");
      }
    }
  }
  setInterval(expireProofs, 10000);
  document.addEventListener("visibilitychange", expireProofs);

  function verificationContact(channel) {
    return channel === "email" ? normalizeEmail(emailInput.value) : normalizePhone(phoneInput.value);
  }

  async function post(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { status: response.status, fields: data.fields });
    return data;
  }

  async function sendCode(channel, button) {
    const contact = verificationContact(channel);
    if (channel === "email" && !isEduEmail(contact)) {
      emailInput.setCustomValidity("Please enter a valid U.S. college or university email ending in .edu.");
      emailInput.reportValidity();
      return;
    }
    emailInput.setCustomValidity("");
    if (channel === "sms" && !contact) {
      phoneInput.setCustomValidity("Please enter a valid phone number, including + and country code if outside the U.S.");
      phoneInput.reportValidity();
      return;
    }
    phoneInput.setCustomValidity("");
    setBusy(button, true, "Sending…");
    setStatus(channel, "pending", "Sending your code…");
    try {
      if (!state.botProof && !state.botChallenge && !["localhost", "127.0.0.1"].includes(location.hostname)) {
        throw new Error("Complete the security check before requesting a code.");
      }
      const data = await post("/api/verification-start", {
        channel,
        value: contact,
        website: form.elements.website.value,
        botProof: state.botProof,
        botChallenge: state.botChallenge,
      });
      if (data.botProof) state.botProof = data.botProof;
      resetBotChallenge();
      $(`[data-code-row="${channel}"]`).hidden = false;
      setStatus(channel, "pending", channel === "email" ? "Code sent. Check your school inbox." : "Code sent by text.");
      $(`[data-code-input="${channel}"]`).focus();
    } catch (error) {
      resetBotChallenge();
      if (error.status === 403) state.botProof = "";
      setStatus(channel, "error", error.message);
    } finally {
      setBusy(button, false, "");
    }
  }

  async function checkCode(channel, button) {
    const codeInput = $(`[data-code-input="${channel}"]`);
    const contact = verificationContact(channel);
    if (!/^\d{4,10}$/.test(codeInput.value.trim())) {
      codeInput.setCustomValidity("Enter the code you received.");
      codeInput.reportValidity();
      return;
    }
    codeInput.setCustomValidity("");
    setBusy(button, true, "Checking…");
    try {
      const data = await post("/api/verification-check", {
        channel,
        value: contact,
        code: codeInput.value.trim(),
        website: form.elements.website.value,
        botProof: state.botProof,
        botChallenge: state.botChallenge,
      });
      if (data.botProof) state.botProof = data.botProof;
      state[channel] = { token: data.token, contact: data.contact, expiresAt: data.expiresAt };
      resetBotChallenge();
      const input = channel === "email" ? emailInput : phoneInput;
      input.setAttribute("readonly", "");
      input.closest(".verification-block").classList.add("is-verified");
      $(`[data-code-row="${channel}"]`).hidden = true;
      setStatus(channel, "verified", channel === "email" ? "School email verified." : "Phone number verified.");
    } catch (error) {
      resetBotChallenge();
      if (error.status === 403) state.botProof = "";
      setStatus(channel, "error", error.message);
    } finally {
      setBusy(button, false, "");
    }
  }

  $$('[data-action="send-code"]').forEach((button) => {
    button.addEventListener("click", () => sendCode(button.dataset.channel, button));
  });
  $$('[data-action="check-code"]').forEach((button) => {
    button.addEventListener("click", () => checkCode(button.dataset.channel, button));
  });
  $$('[data-action="change-contact"]').forEach((button) => {
    button.addEventListener("click", () => {
      const channel = button.dataset.channel;
      invalidate(channel);
      (channel === "email" ? emailInput : phoneInput).focus();
    });
  });

  emailInput.addEventListener("input", () => {
    emailInput.setCustomValidity("");
    if (state.email.token && normalizeEmail(emailInput.value) !== state.email.contact) invalidate("email");
  });
  emailInput.addEventListener("blur", () => {
    if (emailInput.value && !isEduEmail(emailInput.value)) {
      emailInput.setCustomValidity("Please enter a valid U.S. college or university email ending in .edu.");
    } else {
      emailInput.setCustomValidity("");
    }
  });
  phoneInput.addEventListener("input", () => {
    phoneInput.setCustomValidity("");
    if (state.sms.token && normalizePhone(phoneInput.value) !== state.sms.contact) invalidate("sms");
  });

  const universitySuggestions = $("#university-suggestions");
  const universityOptions = $$("#university-options option").map((option) => option.value || option.textContent.trim());
  let activeUniversitySuggestion = -1;

  function closeUniversitySuggestions() {
    universitySuggestions.hidden = true;
    universityInput.setAttribute("aria-expanded", "false");
    activeUniversitySuggestion = -1;
  }

  function syncOtherInstitution() {
    const show = universityInput.value === "Other US college or university";
    otherInstitution.hidden = !show;
    $("#other-institution").required = show;
    if (!show) $("#other-institution").value = "";
  }

  function chooseUniversity(value) {
    universityInput.value = value;
    closeUniversitySuggestions();
    syncOtherInstitution();
    universityInput.focus();
  }

  function renderUniversitySuggestions() {
    const query = universityInput.value.trim().toLowerCase();
    universitySuggestions.replaceChildren();
    if (!query) return closeUniversitySuggestions();

    const matches = universityOptions
      .filter((school) => school.toLowerCase().includes(query))
      .sort((a, b) => Number(!a.toLowerCase().startsWith(query)) - Number(!b.toLowerCase().startsWith(query)))
      .slice(0, 8);
    if (!matches.length) return closeUniversitySuggestions();

    matches.forEach((school) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "suggestion-option";
      option.setAttribute("role", "option");
      option.textContent = school;
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => chooseUniversity(school));
      universitySuggestions.append(option);
    });
    universitySuggestions.hidden = false;
    universityInput.setAttribute("aria-expanded", "true");
    activeUniversitySuggestion = -1;
  }

  function moveUniversitySuggestion(direction) {
    const options = $$(".suggestion-option", universitySuggestions);
    if (!options.length) return;
    activeUniversitySuggestion = (activeUniversitySuggestion + direction + options.length) % options.length;
    options.forEach((option, index) => option.classList.toggle("active", index === activeUniversitySuggestion));
    options[activeUniversitySuggestion].scrollIntoView({ block: "nearest" });
  }

  universityInput.addEventListener("input", () => {
    syncOtherInstitution();
    renderUniversitySuggestions();
  });
  universityInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (universitySuggestions.hidden) renderUniversitySuggestions();
      moveUniversitySuggestion(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveUniversitySuggestion(-1);
    } else if (event.key === "Enter" && activeUniversitySuggestion >= 0) {
      event.preventDefault();
      chooseUniversity($$(".suggestion-option", universitySuggestions)[activeUniversitySuggestion].textContent);
    } else if (event.key === "Escape") {
      closeUniversitySuggestions();
    }
  });
  universityInput.addEventListener("blur", closeUniversitySuggestions);
  universityInput.addEventListener("change", syncOtherInstitution);
  syncOtherInstitution();

  const acquisitionPrompts = {
    "Student organization or club": "What organization or club?",
    "Professor or researcher": "Which professor, class, or research group?",
    "Social media": "Which platform or account?",
    "Other": "Where did you hear about Campus Takes?",
  };

  function syncAcquisitionDetail() {
    const prompt = acquisitionPrompts[$("#acquisition-channel").value];
    acquisitionDetailWrap.hidden = !prompt;
    acquisitionDetailInput.required = Boolean(prompt);
    if (prompt) {
      acquisitionDetailLabel.childNodes[0].textContent = `${prompt} `;
    } else {
      acquisitionDetailInput.value = "";
    }
  }

  $("#acquisition-channel").addEventListener("change", syncAcquisitionDetail);
  syncAcquisitionDetail();

  $$("[data-exclusive]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (!checkbox.checked) return;
      const group = checkbox.name;
      $$(`input[name="${group}"]`).forEach((item) => {
        if (item !== checkbox) item.checked = false;
      });
    });
  });
  $$("input[type=checkbox]:not([data-exclusive])").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (!checkbox.checked || !checkbox.name.endsWith("[]")) return;
      $$(`input[name="${checkbox.name}"][data-exclusive]`).forEach((item) => { item.checked = false; });
    });
  });

  function selectedValues(name) {
    return $$(`input[name="${name}[]"]:checked`, form).map((input) => input.value);
  }

  function payload() {
    const data = new FormData(form);
    return {
      requestId: state.requestId,
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      schoolEmail: data.get("schoolEmail"),
      mobilePhone: data.get("mobilePhone"),
      university: data.get("university"),
      otherInstitution: data.get("otherInstitution") || "",
      campusCity: data.get("campusCity"),
      academicLevel: data.get("academicLevel"),
      gradMonth: data.get("gradMonth"),
      gradYear: data.get("gradYear"),
      academicArea: data.get("academicArea"),
      major: data.get("major"),
      birthYear: data.get("birthYear"),
      livingSituation: data.get("livingSituation"),
      greekLife: data.get("greekLife"),
      studentAthlete: data.get("studentAthlete"),
      studentBackgrounds: selectedValues("studentBackgrounds"),
      gender: data.get("gender"),
      raceEthnicity: selectedValues("raceEthnicity"),
      employmentStatus: data.get("employmentStatus"),
      devices: selectedValues("devices"),
      productsActivities: selectedValues("productsActivities"),
      availability: selectedValues("availability"),
      recordingWillingness: data.get("recordingWillingness"),
      paidResearchBefore: data.get("paidResearchBefore"),
      acquisitionChannel: data.get("acquisitionChannel"),
      acquisitionDetail: data.get("acquisitionDetail") || "",
      confirmAgeEnrollment: data.get("confirmAgeEnrollment") === "yes",
      confirmAccuracy: data.get("confirmAccuracy") === "yes",
      emailConsent: data.get("emailConsent") === "yes",
      smsConsent: data.get("smsConsent") === "yes",
      website: data.get("website"),
      sourceCode: form.dataset.sourceCode,
      applicationUrl: (window.location.origin + window.location.pathname).slice(0, 500),
      emailVerificationToken: state.email.token,
      phoneVerificationToken: state.sms.token,
      botProof: state.botProof,
      botChallenge: state.botChallenge,
    };
  }

  function clearErrors() {
    formAlert.hidden = true;
    formAlert.textContent = "";
    $$(".field-error", form).forEach((node) => { node.textContent = ""; });
    $$("[aria-invalid=true]", form).forEach((node) => node.removeAttribute("aria-invalid"));
  }

  function showErrors(error) {
    formAlert.hidden = false;
    formAlert.textContent = error.message;
    if (!error.fields) {
      formAlert.focus();
      return;
    }
    let first;
    Object.entries(error.fields).forEach(([name, message]) => {
      const input = form.elements[name] || form.querySelector(`[name="${name}[]"]`);
      const errorNode = form.querySelector(`[data-error-for="${name}"]`);
      if (errorNode) errorNode.textContent = message;
      if (input) {
        const node = input instanceof RadioNodeList ? input[0] : input;
        node?.setAttribute("aria-invalid", "true");
        if (!first) first = node;
      }
    });
    const sectionIndex = first ? sections.indexOf(first.closest(".form-section")) : -1;
    if (sectionIndex >= 0) showStep(sectionIndex, false);
    (first || formAlert).focus();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    if (currentStep < sections.length - 1) {
      advanceStep();
      return;
    }
    clearErrors();
    expireProofs();
    if (sections.some((section, index) => !validateSection(index))) return;
    setBusy(submitButton, true, "Submitting…");
    backButton.disabled = true;
    try {
      await post("/api/applications", payload());
      form.hidden = true;
      const success = $("#application-success");
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    } catch (error) {
      resetBotChallenge();
      if (error.fields?.schoolEmail) invalidate("email");
      if (error.fields?.mobilePhone) invalidate("sms");
      showErrors(error);
    } finally {
      setBusy(submitButton, false, "");
      backButton.disabled = false;
    }
  });

  const params = new URLSearchParams(window.location.search);
  form.dataset.sourceCode = (params.get("src") || params.get("utm_source") || "website").slice(0, 100);

  // Keep the full form available if JavaScript does not initialize. Hidden steps
  // stay enabled so their answers and verification proofs survive navigation.
  sections.forEach(section => $("legend", section).setAttribute("tabindex", "-1"));
  $$(".field-error[data-error-for]", form).forEach(error => {
    error.id = `error-${error.dataset.errorFor}`;
    const name = error.dataset.errorFor;
    $$(`[name="${name}"], [name="${name}[]"]`, form).forEach(input => {
      input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
    });
  });
  const botCheck = $(".bot-check", form);
  sections[0].insertBefore(botCheck, $(".form-grid", sections[0]));
  form.prepend(progress);
  form.append(actions);
  $$('[data-code-input]', form).forEach(input => input.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const button = $(`[data-action="check-code"][data-channel="${input.dataset.codeInput}"]`);
    if (!button.disabled) checkCode(input.dataset.codeInput, button);
  }));
  showStep(0, false);
})();
