const businessName = document.getElementById("businessName");
const businessType = document.getElementById("businessType");
const highlights = document.getElementById("highlights");
const platform = document.getElementById("platform");
const stars = document.getElementById("stars");
const tone = document.getElementById("tone");
const reviewText = document.getElementById("reviewText");

const reply1 = document.getElementById("reply1");
const reply2 = document.getElementById("reply2");
const reply3 = document.getElementById("reply3");

const sentimentEl = document.getElementById("sentiment");
const issuesEl = document.getElementById("issues");

const generateBtn = document.getElementById("generate");
const regenBtn = document.getElementById("regenerate");
const copyAllBtn = document.getElementById("copyAll");

// --------------------
// Paywall (5/day)
// --------------------
const PAYWALL_LIMIT = 5;

const usesTodayEl = document.getElementById("usesToday");
const paywallEl = document.getElementById("paywall");
const closePaywallBtn = document.getElementById("closePaywall");
const upgradeBtn = document.getElementById("upgradeBtn");

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `uses_${y}-${m}-${day}`;
}

function getUsesToday() {
  return Number(localStorage.getItem(todayKey()) || "0");
}

function setUsesToday(n) {
  localStorage.setItem(todayKey(), String(n));
  if (usesTodayEl) usesTodayEl.innerText = String(n);
}

function openPaywall() {
  if (paywallEl) paywallEl.style.display = "block";
}

function closePaywall() {
  if (paywallEl) paywallEl.style.display = "none";
}

function canGenerate() {
  return getUsesToday() < PAYWALL_LIMIT;
}

if (closePaywallBtn) closePaywallBtn.addEventListener("click", closePaywall);

if (upgradeBtn) {
  upgradeBtn.addEventListener("click", () => {
    alert("Next step: Stripe checkout + Pro plan. We'll wire this up next.");
  });
}

// click outside modal closes it
if (paywallEl) {
  paywallEl.addEventListener("click", (e) => {
    if (e.target === paywallEl) closePaywall();
  });
}

// initialize counter display
setUsesToday(getUsesToday());

// --------------------
// Helpers
// --------------------
function getFormData() {
  return {
    businessName: businessName.value.trim(),
    businessType: businessType ? businessType.value : "other",
    highlights: highlights ? highlights.value.trim() : "",
    platform: platform.value,
    stars: Number(stars.value),
    tone: tone.value,
    reviewText: reviewText.value.trim(),
  };
}

function setLoading(isLoading) {
  if (isLoading) {
    reply1.textContent = "Generating...";
    reply2.textContent = "";
    reply3.textContent = "";
    generateBtn.disabled = true;
    regenBtn.disabled = true;
    copyAllBtn.disabled = true;
  } else {
    generateBtn.disabled = false;
    // These should be enabled only if we already have replies
    const hasReplies =
      (reply1.innerText || "").trim() ||
      (reply2.innerText || "").trim() ||
      (reply3.innerText || "").trim();

    regenBtn.disabled = !hasReplies;
    copyAllBtn.disabled = !hasReplies;
  }
}

// --------------------
// Main generate call
// --------------------
async function runGenerate() {
  // Paywall check first (so we don't waste API calls)
  if (!canGenerate()) {
    openPaywall();
    return;
  }

  const payload = getFormData();

  if (!payload.businessName || !payload.reviewText) {
    alert("Please enter a Business Name and a Review.");
    return;
  }

  setLoading(true);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      reply1.textContent = "Error: " + (data.error || "Unknown error");
      sentimentEl.innerText = "";
      issuesEl.innerText = "";
      return;
    }

    sentimentEl.innerText = data.sentiment || "";
    issuesEl.innerText = (data.issues || []).join(", ");

    reply1.textContent = data.replies?.[0]?.text || "";
    reply2.textContent = data.replies?.[1]?.text || "";
    reply3.textContent = data.replies?.[2]?.text || "";

    // Count usage only on success
    setUsesToday(getUsesToday() + 1);

    // enable extra buttons now that we have content
    regenBtn.disabled = false;
    copyAllBtn.disabled = false;
  } catch (err) {
    reply1.textContent = "Error: " + (err?.message || "Request failed");
  } finally {
    setLoading(false);
  }
}

// --------------------
// Button wiring
// --------------------
generateBtn.addEventListener("click", runGenerate);
regenBtn.addEventListener("click", runGenerate);

copyAllBtn.addEventListener("click", async () => {
  const t1 = (reply1.innerText || "").trim();
  const t2 = (reply2.innerText || "").trim();
  const t3 = (reply3.innerText || "").trim();

  const combined = [t1, t2, t3].filter(Boolean).join("\n\n---\n\n");
  if (!combined) {
    alert("Nothing to copy yet — generate replies first.");
    return;
  }

  await navigator.clipboard.writeText(combined);
  const old = copyAllBtn.innerText;
  copyAllBtn.innerText = "Copied!";
  setTimeout(() => (copyAllBtn.innerText = old), 1200);
});

// Keep your per-reply Copy buttons working
function copyText(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text);
  alert("Copied!");
}
window.copyText = copyText;

// initial state
if (regenBtn) regenBtn.disabled = true;
if (copyAllBtn) copyAllBtn.disabled = true;