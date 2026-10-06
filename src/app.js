const trackEvent = (event, payload = {}) => {
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...payload });
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
