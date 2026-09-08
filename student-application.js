(() => {
  const form = document.querySelector("#student-application");
  if (!form) return;

  const state = {
    email: { token: "", contact: "" },
    sms: { token: "", contact: "" },
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const emailInput = $("#school-email");
  const phoneInput = $("#mobile-phone");
  const submitButton = $("#application-submit");
  const formAlert = $("#form-alert");
  const otherInstitution = $("#other-institution-wrap");
  const acquisitionDetailWrap = $("#acquisition-detail-wrap");
  const acquisitionDetailInput = $("#acquisition-detail");
  const acquisitionDetailLabel = $("#acquisition-detail-label");

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
      await post("/api/verification-start", {
        channel,
        value: contact,
        website: form.elements.website.value,
      });
      $(`[data-code-row="${channel}"]`).hidden = false;
      setStatus(channel, "pending", channel === "email" ? "Code sent. Check your school inbox." : "Code sent by text.");
      $(`[data-code-input="${channel}"]`).focus();
    } catch (error) {
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
      });
      state[channel] = { token: data.token, contact: data.contact };
      const input = channel === "email" ? emailInput : phoneInput;
      input.setAttribute("readonly", "");
      input.closest(".verification-block").classList.add("is-verified");
      $(`[data-code-row="${channel}"]`).hidden = true;
      setStatus(channel, "verified", channel === "email" ? "School email verified." : "Phone number verified.");
    } catch (error) {
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

  $("#university").addEventListener("change", (event) => {
    const show = event.target.value === "Other US college or university";
    otherInstitution.hidden = !show;
    $("#other-institution").required = show;
    if (!show) $("#other-institution").value = "";
  });

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
      applicationUrl: window.location.href.slice(0, 500),
      emailVerificationToken: state.email.token,
      phoneVerificationToken: state.sms.token,
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
    (first || formAlert).focus();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    if (!form.reportValidity()) return;
    if (!state.email.token || !state.sms.token) {
      showErrors(Object.assign(new Error("Verify both your school email and phone number before applying."), {
        fields: {
          ...(!state.email.token ? { schoolEmail: "Verify your school email." } : {}),
          ...(!state.sms.token ? { mobilePhone: "Verify your phone number." } : {}),
        },
      }));
      return;
    }
    setBusy(submitButton, true, "Submitting…");
    try {
      await post("/api/applications", payload());
      form.hidden = true;
      const success = $("#application-success");
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    } catch (error) {
      showErrors(error);
    } finally {
      setBusy(submitButton, false, "");
    }
  });

  const params = new URLSearchParams(window.location.search);
  form.dataset.sourceCode = (params.get("src") || params.get("utm_source") || "website").slice(0, 100);
})();
