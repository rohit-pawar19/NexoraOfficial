document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reviewForm");
  const list = document.getElementById("reviewsList");
  const summary = document.getElementById("reviewsSummary");
  const loading = document.getElementById("reviewsLoading");
  const status = document.getElementById("reviewStatus");
  const retry = document.getElementById("reviewsRetry");
  if (!form || !list || !summary || !loading || !status) return;
  // VS Code Live Server serves files only; local previews use the Node preview server.
  const isStaticPreview =
    location.protocol === "file:" ||
    (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
      /^55\d{2}$/.test(location.port));
  const api = isStaticPreview
    ? "http://localhost:3100/api/reviews"
    : "/api/reviews";
  const unavailable = isStaticPreview
    ? "Reviews are not connected. Start the website preview server with npm run preview, then try again."
    : "The review service is unavailable. Please try again shortly.";
  const readResponse = async (response) => {
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(unavailable);
    }
    if (!response.ok) throw new Error(data?.message || unavailable);
    return data;
  };
  const isReview = (review) =>
    review &&
    typeof review.id === "string" &&
    typeof review.name === "string" &&
    typeof review.message === "string" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    Number.isFinite(Date.parse(review.createdAt));
  let current = [];
  let revision = 0;
  const render = (reviews) => {
    if (!Array.isArray(reviews) || !reviews.every(isReview))
      throw new Error(unavailable);
    current = reviews;
    revision++;
    if (retry) retry.hidden = true;
    loading.textContent = reviews.length
      ? ""
      : "Be the first to share your experience.";
    summary.textContent = reviews.length
      ? `${(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)} / 5 · ${reviews.length} recent review${reviews.length === 1 ? "" : "s"}`
      : "Client reviews";
    list.replaceChildren(
      ...reviews.map((review) => {
        const card = document.createElement("article");
        card.className = "review-card";
        const name = document.createElement("h4");
        name.textContent = review.name;
        const stars = document.createElement("div");
        stars.className = "review-stars";
        stars.textContent =
          "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
        stars.setAttribute("aria-label", `${review.rating} out of 5 stars`);
        const message = document.createElement("p");
        message.textContent = review.message;
        const date = document.createElement("time");
        date.dateTime = review.createdAt;
        date.textContent = new Date(review.createdAt).toLocaleDateString(
          undefined,
          { day: "numeric", month: "short", year: "numeric" },
        );
        card.append(stars, message, name, date);
        return card;
      }),
    );
  };
  const refresh = async () => {
    const started = revision;
    if (retry) retry.disabled = true;
    try {
      const response = await fetch(api, { cache: "no-store" });
      const reviews = await readResponse(response);
      if (revision === started) render(reviews);
    } catch {
      if (!revision) loading.textContent = unavailable;
      if (retry) retry.hidden = false;
    } finally {
      if (retry) retry.disabled = false;
    }
  };
  retry?.addEventListener("click", refresh);
  refresh();
  let stream;
  if ((isStaticPreview || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) && "EventSource" in window) {
    stream = new EventSource(`${api}/stream`);
    stream.onmessage = (event) => {
      try {
        render(JSON.parse(event.data));
      } catch {
        /* Preserve the last valid list. */
      }
    };
  }
  // Also refresh after reconnecting, or when streaming is unavailable.
  const poll = setInterval(() => {
    if (!document.hidden && (!stream || stream.readyState !== 1)) refresh();
  }, 15000);
  window.addEventListener("pagehide", () => {
    stream?.close();
    clearInterval(poll);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    button.disabled = true;
    status.textContent = "Publishing your review…";
    status.className = "";
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          rating: Number(data.get("rating")),
          message: data.get("message"),
        }),
      });
      const review = await readResponse(response);
      if (!isReview(review)) throw new Error(unavailable);
      render(
        [review, ...current.filter((item) => item.id !== review.id)].slice(
          0,
          100,
        ),
      );
      form.reset();
      status.textContent = "Thank you! Your review is now published.";
      status.className = "success";
      list.firstElementChild?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
    } catch (error) {
      status.textContent =
        error instanceof TypeError ? unavailable : error.message;
      status.className = "error";
    } finally {
      button.disabled = false;
    }
  });
});
