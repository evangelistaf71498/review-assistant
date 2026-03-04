const businessName = document.getElementById("businessName");
const platform = document.getElementById("platform");
const stars = document.getElementById("stars");
const tone = document.getElementById("tone");
const reviewText = document.getElementById("reviewText");

const reply1 = document.getElementById("reply1");
const reply2 = document.getElementById("reply2");
const reply3 = document.getElementById("reply3");

document.getElementById("generate").addEventListener("click", async () => {
  reply1.textContent = "Generating...";
  reply2.textContent = "";
  reply3.textContent = "";

  const payload = {
    businessName: businessName.value,
    platform: platform.value,
    stars: Number(stars.value),
    tone: tone.value,
    reviewText: reviewText.value
  };

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    reply1.textContent = "Error: " + (data.error || "Unknown error");
    return;
  }
document.getElementById("sentiment").innerText = data.sentiment || "";

document.getElementById("issues").innerText =
  (data.issues || []).join(", ");
  reply1.textContent = data.replies?.[0]?.text || "";
  reply2.textContent = data.replies?.[1]?.text || "";
  reply3.textContent = data.replies?.[2]?.text || "";
});
function copyText(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text);
  alert("Copied!");
}