(() => {
  const previewObserver = new ResizeObserver((entries) => {
    entries.forEach(({ target, contentRect }) => {
      if (contentRect.width) target.style.setProperty("--preview-scale", contentRect.width / 1440);
    });
  });
  document.querySelectorAll(".website-preview").forEach(preview => previewObserver.observe(preview));
  const enquiry = document.getElementById("workEnquiry");
  const enquiryForm = document.getElementById("quoteForm");
  let enquiryTrigger;
  document.querySelectorAll(".work-enquire").forEach((button) => {
    button.addEventListener("click", () => {
      enquiryTrigger = button;
      const service = button.closest(".portfolio-collection").querySelector("h3").textContent;
      document.getElementById("enquiryProject").textContent = service;
      enquiryForm.elements.service.value = service;
      enquiryForm.elements.message.value = "";
      document.getElementById("formStatus").textContent = "";
      enquiry.showModal();
      document.body.classList.add("enquiry-open");
      document.getElementById("work-name").focus();
    });
  });
  enquiry.querySelector(".enquiry-close").addEventListener("click", () => enquiry.close());
  enquiry.addEventListener("click", (event) => {
    const bounds = enquiry.getBoundingClientRect();
    if (event.target === enquiry && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) enquiry.close();
  });
  enquiry.addEventListener("close", () => {
    document.body.classList.remove("enquiry-open");
    enquiryTrigger?.focus();
  });
  enquiryForm.addEventListener("submit", (event) => event.preventDefault());
  const filter = document.getElementById("work-service");
  const collections = [...document.querySelectorAll(".portfolio-collection")];
  const status = document.getElementById("work-status");
  if (!filter || !status) return;

  function updateGallery() {
    const showAll = filter.value === "all";
    let visibleCount = 0;
    collections.forEach((collection) => {
      collection.hidden = !showAll && collection.dataset.service !== filter.value;
      collection.querySelectorAll(".portfolio-card").forEach((card, index) => {
        card.hidden = collection.hidden || (showAll && collection.dataset.service !== "website" && index >= 4);
        const preview = card.querySelector("iframe[data-preview-src]");
        if (preview && !card.hidden && !preview.hasAttribute("src")) {
          preview.src = preview.dataset.previewSrc;
        }
        if (!card.hidden) visibleCount += 1;
        const video = card.querySelector("video");
        if (video && card.hidden) video.pause();
      });
    });
    status.textContent = showAll
      ? `${visibleCount} selected projects · Choose a service to see the full collection`
      : `${visibleCount} ${visibleCount === 1 ? "project" : "projects"} · ${filter.selectedOptions[0].textContent}`;
  }

  filter.value = "all";
  filter.addEventListener("change", updateGallery);
  updateGallery();
})();
