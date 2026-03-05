// --------------------
// Grab elements
// --------------------
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

// Paywall elements
const usesTodayEl = document.getElementById("usesToday");
const paywallEl = document.getElementById("paywall");
const closePaywallBtn = document.getElementById("closePaywall");
const upgradeBtn = document.getElementById("upgradeBtn");

// --------------------
// Paywall config
// --------------------
const PAYWALL_LIMIT = 5;
const WAITLIST_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfF9ctXwcVI1UbsErnSnVy8WZI0IxutoIBkOp3lyQXuO_CxYQ/viewform";

// --------------------
// Paywall helpers
// --------------------
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

function updateUsageUI() {
  const used = getUsesToday();
  const remaining = PAYWALL_LIMIT - used;

  if (usesTodayEl) usesTodayEl.innerText = `${used} (remaining ${remaining})`;

  const hasReplies =
    ((reply1?.innerText || "").trim().length > 0) ||
    ((reply2?.innerText || "").trim().length > 0) ||
    ((reply3?.innerText || "").trim().length > 0);

  const blocked = used >= PAYWALL_LIMIT;

  if (regenBtn) regenBtn.disabled = !hasReplies || blocked;
  if (copyAllBtn) copyAllBtn.disabled = !hasReplies;

  if (generateBtn) generateBtn.disabled = false;
}


function setUsesToday(n) {
  localStorage.setItem(todayKey(), String(n));
  updateUsageUI();
}

function openPaywall() {
  if (!paywallEl) {
    alert("Paywall element not found in index.html (missing id='paywall').");
    return;
  }
  paywallEl.style.display = "block";
}

function closePaywall() {
  if (paywallEl) paywallEl.style.display = "none";
}

function canGenerate() {
  return getUsesToday() < PAYWALL_LIMIT;
}

// Wire paywall buttons
if (closePaywallBtn) closePaywallBtn.addEventListener("click", closePaywall);

if (upgradeBtn) {
  upgradeBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/create-checkout-session", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        alert("Stripe error: " + (data.error || "No checkout URL returned"));
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      alert("Stripe error: " + (err?.message || "Request failed"));
    }
  });
}
// click outside the modal to close
if (paywallEl) {
  paywallEl.addEventListener("click", (e) => {
    if (e.target === paywallEl) closePaywall();
  });
}

// Initialize counter on load
setUsesToday(getUsesToday());

// --------------------
// General helpers
// --------------------
function getFormData() {
  return {
    businessName: (businessName?.value || "").trim(),
    businessType: businessType ? businessType.value : "other",
    highlights: (highlights?.value || "").trim(),
    platform: platform?.value || "Google",
    stars: Number(stars?.value || 0),
    tone: tone?.value || "professional",
    reviewText: (reviewText?.value || "").trim(),
  };
}

function setLoading(isLoading) {
  if (isLoading) {
    reply1.textContent = "Generating...";
    reply2.textContent = "";
    reply3.textContent = "";
    if (generateBtn) generateBtn.disabled = true;
    if (regenBtn) regenBtn.disabled = true;
    if (copyAllBtn) copyAllBtn.disabled = true;
  } else {
    updateUsageUI();
  }
}

// --------------------
// Main generate
// --------------------
async function runGenerate() {
  // If blocked, show paywall and stop
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
      if (sentimentEl) sentimentEl.innerText = "";
      if (issuesEl) issuesEl.innerText = "";
      return;
    }

    if (sentimentEl) sentimentEl.innerText = data.sentiment || "";
    if (issuesEl) issuesEl.innerText = (data.issues || []).join(", ");

    reply1.textContent = data.replies?.[0]?.text || "";
    reply2.textContent = data.replies?.[1]?.text || "";
    reply3.textContent = data.replies?.[2]?.text || "";

    // Increment usage ONLY after success
    const next = getUsesToday() + 1;
    setUsesToday(next);

    // Show paywall immediately after the 5th success
    if (next >= PAYWALL_LIMIT) {
      openPaywall();
    }
  } catch (err) {
    reply1.textContent = "Error: " + (err?.message || "Request failed");
  } finally {
    setLoading(false);
  }
}

// --------------------
// Button wiring
// --------------------
if (generateBtn) generateBtn.addEventListener("click", runGenerate);
if (regenBtn) regenBtn.addEventListener("click", runGenerate);

if (copyAllBtn) {
  copyAllBtn.addEventListener("click", async () => {
    const t1 = (reply1?.innerText || "").trim();
    const t2 = (reply2?.innerText || "").trim();
    const t3 = (reply3?.innerText || "").trim();

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
}

// Keep per-reply copy buttons working (onclick in HTML)
function copyText(id) {
  const el = document.getElementById(id);
  const text = (el?.innerText || "").trim();
  if (!text) return;
  navigator.clipboard.writeText(text);
  alert("Copied!");
}
window.copyText = copyText;

// Initial disable state
if (regenBtn) regenBtn.disabled = true;
if (copyAllBtn) copyAllBtn.disabled = true;
updateUsageUI();

