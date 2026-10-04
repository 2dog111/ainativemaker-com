const trackEvent = (event, payload = {}) => {
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...payload });
};

const reachMetrikaGoal = (goal, payload = {}) => {
  if (typeof window.ym === "function") window.ym(111975649, "reachGoal", goal, payload);
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-event]");
  if (!target) return;
  trackEvent(target.dataset.event);
});

const progress = document.querySelector("[data-progress]");
const journalStart = document.querySelector("[data-journal-start]");
const depthEvents = new Set();
let progressTicking = false;

const updateViewportState = () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const percent = total > 0 ? Math.min(100, window.scrollY / total * 100) : 0;
  progress.value = percent;

  const journalTop = journalStart.offsetTop;
  const journalEnd = journalStart.offsetTop + journalStart.offsetHeight;
  const journalDepth = Math.max(0, Math.min(100, ((window.scrollY + window.innerHeight - journalTop) / Math.max(1, journalEnd - journalTop)) * 100));
  for (const mark of [25, 50, 75, 100]) {
    if (journalDepth >= mark && !depthEvents.has(mark)) {
      depthEvents.add(mark);
      trackEvent(`journal_depth_${mark}`);
    }
  }

  progressTicking = false;
};

window.addEventListener("scroll", () => {
  if (progressTicking) return;
  progressTicking = true;
  requestAnimationFrame(updateViewportState);
}, { passive: true });
window.addEventListener("resize", updateViewportState, { passive: true });
updateViewportState();

const entries = [...document.querySelectorAll("[data-entry]")];

const entryObserver = new IntersectionObserver((observed) => {
  const visible = observed
    .filter((item) => item.isIntersecting)
    .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
  if (!visible.length) return;
  try {
    localStorage.setItem("lastReadEntryId", visible[0].target.id);
    localStorage.setItem("lastReadAt", new Date().toISOString());
  } catch {}
}, { rootMargin: "-18% 0px -62%", threshold: 0 });
for (const entry of entries) entryObserver.observe(entry);

const monthLinks = [...document.querySelectorAll("[data-month-link]")];
const monthObserver = new IntersectionObserver((observed) => {
  const current = observed.find((item) => item.isIntersecting);
  if (!current) return;
  for (const link of monthLinks) {
    if (link.dataset.monthLink === current.target.dataset.month) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
}, { rootMargin: "-12% 0px -75%", threshold: 0 });
for (const month of document.querySelectorAll("[data-month]")) monthObserver.observe(month);

const leadForm = document.querySelector("[data-lead-form]");
const leadStatus = document.querySelector("[data-form-status]");
const contactInput = document.querySelector("[data-contact-input]");
const contactLabel = document.querySelector("[data-contact-label]");
// Тексты формы по языку страницы: английская главная и русская `/ru/`
// используют один скрипт.
const pageLang = document.documentElement.lang === "ru" ? "ru" : "en";
const messages = {
  ru: {
    contactMethods: {
      Telegram: { label: "Ваш Telegram", placeholder: "@username", autocomplete: "off", inputMode: "text", error: "Укажите имя пользователя в Telegram." },
      WhatsApp: { label: "Ваш WhatsApp", placeholder: "+7 999 000-00-00", autocomplete: "tel", inputMode: "tel", error: "Укажите номер WhatsApp." },
      SMS: { label: "Номер для SMS", placeholder: "+7 999 000-00-00", autocomplete: "tel", inputMode: "tel", error: "Укажите номер телефона для SMS." }
    },
    nameRequired: "Укажите имя.",
    emailInvalid: "Проверьте email или оставьте поле пустым.",
    sending: "Отправляю…",
    saved: "Заявка сохранена. Я отвечу там, где вам удобно.",
    savedButton: "Заявка сохранена",
    failed: "Не удалось отправить заявку.",
    network: "Не удалось отправить заявку. Проверьте интернет и попробуйте ещё раз или напишите в Telegram.",
    retry: "Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram."
  },
  en: {
    contactMethods: {
      Telegram: { label: "Your Telegram", placeholder: "@username", autocomplete: "off", inputMode: "text", error: "Enter your Telegram username." },
      WhatsApp: { label: "Your WhatsApp", placeholder: "+1 415 555-0100", autocomplete: "tel", inputMode: "tel", error: "Enter your WhatsApp number." },
      SMS: { label: "Number for SMS", placeholder: "+1 415 555-0100", autocomplete: "tel", inputMode: "tel", error: "Enter a phone number for SMS." }
    },
    nameRequired: "Enter your name.",
    emailInvalid: "Check the email address or leave the field empty.",
    sending: "Sending…",
    saved: "Saved. I will reply where you asked me to.",
    savedButton: "Request saved",
    failed: "Could not send the request.",
    network: "Could not send the request. Check your connection and try again, or message me on Telegram.",
    retry: "Could not send the request. Try again or message me on Telegram."
  }
}[pageLang];
const contactMethods = messages.contactMethods;

const updateContactMethod = () => {
  const method = leadForm?.elements.contactMethod.value ?? "Telegram";
  const config = contactMethods[method] ?? contactMethods.Telegram;
  contactLabel.textContent = config.label;
  contactInput.placeholder = config.placeholder;
  contactInput.autocomplete = config.autocomplete;
  contactInput.inputMode = config.inputMode;
};

for (const radio of document.querySelectorAll('input[name="contactMethod"]')) {
  radio.addEventListener("change", updateContactMethod);
}

const showFormError = (message, field) => {
  for (const input of leadForm?.querySelectorAll('[aria-invalid="true"]') ?? []) {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
  for (const error of leadForm?.querySelectorAll("[data-error-for]") ?? []) {
    error.hidden = true;
    error.textContent = "";
  }
  leadStatus.textContent = "";
  delete leadStatus.dataset.state;
  if (field?.name) {
    const fieldError = leadForm.querySelector(`[data-error-for="${field.name}"]`);
    if (fieldError) {
      fieldError.id ||= `${field.name}-error`;
      fieldError.textContent = message;
      fieldError.hidden = false;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", fieldError.id);
    }
  } else {
    leadStatus.textContent = message;
    leadStatus.dataset.state = "error";
  }
  field?.focus();
};

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(leadForm);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    contactMethod: String(formData.get("contactMethod") ?? "Telegram"),
    contact: String(formData.get("contact") ?? "").trim(),
    task: String(formData.get("task") ?? "").trim(),
    website: String(formData.get("website") ?? ""),
    lang: pageLang
  };

  if (!payload.name) return showFormError(messages.nameRequired, leadForm.elements.name);
  if (!payload.contact) return showFormError((contactMethods[payload.contactMethod] ?? contactMethods.Telegram).error, leadForm.elements.contact);
  if (payload.email && !leadForm.elements.email.validity.valid) return showFormError(messages.emailInvalid, leadForm.elements.email);

  const submit = leadForm.querySelector('[type="submit"]');
  submit.disabled = true;
  submit.textContent = messages.sending;
  leadStatus.textContent = "";
  delete leadStatus.dataset.state;

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || messages.failed);
    leadForm.reset();
    updateContactMethod();
    leadStatus.textContent = messages.saved;
    leadStatus.dataset.state = "success";
    submit.textContent = messages.savedButton;
    const goalPayload = { contact_method: payload.contactMethod.toLocaleLowerCase("ru") };
    trackEvent("lead_form_submitted", goalPayload);
    reachMetrikaGoal("lead_form_submitted", goalPayload);
  } catch (error) {
    const message = error instanceof TypeError
      ? messages.network
      : error.message || messages.retry;
    showFormError(message);
    submit.disabled = false;
    submit.textContent = submit.dataset.defaultLabel;
  }
});

for (const input of leadForm?.querySelectorAll("input, textarea") ?? []) {
  input.addEventListener("input", () => {
    const fieldError = leadForm.querySelector(`[data-error-for="${input.name}"]`);
    if (fieldError) {
      fieldError.hidden = true;
      fieldError.textContent = "";
    }
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    if (leadStatus.dataset.state === "error") {
      leadStatus.textContent = "";
      delete leadStatus.dataset.state;
    }
  });
}
