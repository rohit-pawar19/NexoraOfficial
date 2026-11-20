/* NexoraOfficial Theme - site interactions */
document.addEventListener("nexora:page-ready", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Close Bootstrap mobile menu after navigation.
  document.querySelectorAll(".navbar a[href]").forEach((link) => {
    link.addEventListener("click", () => {
      const menu = document.getElementById("navbarSupportedContent");
      if (menu && menu.classList.contains("show") && window.bootstrap) {
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
      }
    });
  });

  // Service modal.
  const serviceDetails = {
    "Branding & Creative": {
      description:
        "Build a memorable brand with creative assets designed for every customer touchpoint.",
      offerings: [
        "Logo & Brand Identity",
        "Creative Design",
        "Brochures & Catalogues",
        "Social Media Creatives",
        "Campaign Design",
        "Packaging Design",
      ],
    },
    "Photography & Videography": {
      description:
        "Create polished visual content that presents your products, people and brand at their best.",
      offerings: [
        "Product Photography",
        "Jewellery Photography",
        "Property Photography",
        "Brand Shoots",
        "Reels & Promotional Videos",
        "Corporate & Event Videos",
      ],
    },
    "Real Estate & Builder Marketing": {
      description:
        "Market your project from launch to lead generation with a connected real-estate strategy.",
      offerings: [
        "Project Branding",
        "Property Photography",
        "Brochures & Catalogues",
        "Hoardings & Site Branding",
        "Website & Landing Pages",
        "Social Media Marketing",
        "Digital Ads & Lead Generation",
      ],
    },
    "Jewellery Brand Marketing": {
      description:
        "Showcase every detail of your jewellery and build a consistent, premium brand experience.",
      offerings: [
        "Jewellery Photography",
        "Product Videos & Reels",
        "Catalogue Design",
        "Packaging",
        "Store Branding",
        "Social Media Management",
        "Website & Digital Marketing",
        "Campaigns & Product Launches",
      ],
    },
    "Printing & Production": {
      description:
        "Deliver high-quality printed materials, displays and signage for your brand.",
      offerings: [
        "Flex & Vinyl Printing",
        "Brochures & Flyers",
        "Large Format Printing",
        "Fabric & LED Displays",
        "Acrylic & Metal Signage",
        "Promotional Materials",
      ],
    },
    "Digital Marketing": {
      description:
        "Increase your visibility and turn audience attention into qualified business opportunities.",
      offerings: [
        "Social Media Marketing",
        "Meta & Google Ads",
        "SEO",
        "Lead Generation",
        "Content Creation",
        "YouTube Management",
      ],
    },
    "Website Services": {
      description:
        "Build a high-performing digital home for your brand, from the first screen to ongoing support.",
      offerings: [
        "Website Design",
        "UI/UX",
        "Website Development",
        "Landing Pages",
        "E-commerce Websites",
        "Website Maintenance",
      ],
    },
    "Event & Launch Marketing": {
      description:
        "Plan and deliver memorable launches and on-ground brand experiences from concept to execution.",
      offerings: [
        "Launch Strategy & Promotions",
        "Stage & Venue Branding",
        "Exhibition Stalls & Booths",
        "Invitations & Event Collateral",
        "Event Photography & Videography",
        "On-ground Coordination & Execution",
      ],
    },
  };

  const modal = document.getElementById("serviceModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalOfferings = document.getElementById("modalOfferings");

  document.querySelectorAll(".service-card .card-link").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".service-card");
      const name =
        card?.dataset.service || card?.querySelector("h3")?.textContent.trim();
      if (!modal) return;
      if (modalTitle) modalTitle.textContent = name;
      const details = serviceDetails[name];
      if (modalText)
        modalText.textContent =
          details?.description ||
          details ||
          "Tell us what you need and the Nexora team will recommend the right solution.";
      if (modalOfferings) {
        modalOfferings.replaceChildren(
          ...(details?.offerings || []).map((offering) => {
            const item = document.createElement("li");
            item.textContent = offering;
            return item;
          }),
        );
      }
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  };
  document.querySelector(".modal-close")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  document.getElementById("modalQuote")?.addEventListener("click", closeModal);

  const backToTop = document.getElementById("backToTop");
  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = [...document.querySelectorAll('.nav-link[href^="#"]')];
  let navigationFrame = 0;
  let activeSection;
  let sectionStarts = [];

  function measureSections() {
    sectionStarts = sections.map(section => ({ id: section.id, top: section.offsetTop - 160 }));
    if (!navigationFrame) navigationFrame = requestAnimationFrame(updateScrollNavigation);
  }

  function updateScrollNavigation() {
    navigationFrame = 0;
    const scrollTop = window.scrollY;
    backToTop?.classList.toggle("show", scrollTop > 500);
    if (!navLinks.length) return;
    let current = "";
    sectionStarts.forEach(({ id, top }) => {
      if (scrollTop >= top) current = id;
    });
    if (current === activeSection) return;
    activeSection = current;
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  }

  window.addEventListener("scroll", () => {
    if (!navigationFrame) navigationFrame = requestAnimationFrame(updateScrollNavigation);
  }, { passive: true });
  if (navLinks.length) {
    measureSections();
    if ("ResizeObserver" in window) {
      const sectionSizes = new ResizeObserver(measureSections);
      sectionSizes.observe(document.body);
      sections.forEach(section => sectionSizes.observe(section));
    } else {
      window.addEventListener("resize", measureSections, { passive: true });
    }
  } else if (window.scrollY > 0) updateScrollNavigation();

  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });

  // WhatsApp helper.
  const WHATSAPP_NUMBER = "919325475923";
  function openWhatsApp(
    message = "Hello Nexora, I would like to discuss a project.",
  ) {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function openEmail(
    subject = "Project enquiry",
    body = "Hello Nexora,\n\nI would like to discuss a project.",
  ) {
    window.location.href = `mailto:nexoraadvertising01@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  document.getElementById("floatingWhatsapp")?.addEventListener("click", () => {
    openWhatsApp();
  });

  document.getElementById("footerWhatsapp")?.addEventListener("click", () => {
    openWhatsApp();
  });

  document.getElementById("floatingEmail")?.addEventListener("click", () => {
    openEmail();
  });

  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openWhatsApp(el.dataset.whatsapp || undefined);
    });
  });

  const contactForm = document.getElementById("quoteForm");
  const contactStatus = document.getElementById("formStatus");
  const createEnquiryMessage = (data) =>
    [
      "Hello Nexora, I would like to discuss a project.",
      "",
      `Name: ${data.name || "Not provided"}`,
      `Company: ${data.company || "Not provided"}`,
      `Phone: ${data.phone || "Not provided"}`,
      `Email: ${data.email || "Not provided"}`,
      `Service: ${data.service || "Not provided"}`,
      `Project details: ${data.message || "Not provided"}`,
    ].join("\n");

  const validateContactForm = () => {
    if (!contactForm || contactForm.reportValidity()) return true;
    if (contactStatus) {
      contactStatus.textContent =
        "Please complete the required fields before sending.";
      contactStatus.className = "form-note error";
    }
    return false;
  };

  contactForm
    ?.querySelector("[data-send-email]")
    ?.addEventListener("click", () => {
      if (!validateContactForm()) return;
      const data = Object.fromEntries(new FormData(contactForm));
      const subject = `New enquiry from ${data.name}`;
      openEmail(subject, createEnquiryMessage(data));
    });

  contactForm
    ?.querySelector("[data-send-whatsapp]")
    ?.addEventListener("click", () => {
      if (!validateContactForm()) return;
      openWhatsApp(
        createEnquiryMessage(Object.fromEntries(new FormData(contactForm))),
      );
    });

  // The legacy server-submit handler is disabled; enquiries use the two actions above.
  const form = null;
  const status = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const button = form.querySelector("button[type='submit']");
      const original = button?.innerHTML;
      if (button) {
        button.disabled = true;
        button.innerHTML = "Sending…";
      }

      try {
        const response = await fetch("/api/send-enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const result = await response.json();
        if (!response.ok || !result.success)
          throw new Error(result.message || "Unable to send enquiry.");

        form.reset();
        if (status) {
          status.textContent =
            "Enquiry sent successfully. We will get back to you soon.";
          status.className = "form-note success";
        }
      } catch (error) {
        if (status) {
          status.textContent =
            error.message || "Unable to send enquiry. Please try again.";
          status.className = "form-note error";
        }
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = original;
        }
      }
    });
  }
});

// Reveal each section once. Content stays visible if animation APIs are unavailable.
document.addEventListener("nexora:page-ready", () => {
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  if (
    motionPreference.matches ||
    !("IntersectionObserver" in window) ||
    !("animate" in Element.prototype)
  )
    return;

  const runningAnimations = new Map();
  const timing = getComputedStyle(document.documentElement);
  const easing = timing.getPropertyValue("--motion-ease-enter").trim() || "ease-out";
  const duration = parseFloat(timing.getPropertyValue("--motion-heading-time")) || 580;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        observer.unobserve(element);
        if (element.contains(document.activeElement)) return;

        const siblings = Array.from(element.parentElement.children);
        const animation = element.animate(
          [
            { opacity: 0.55, translate: "0 12px" },
            { opacity: 1, translate: "0 0" },
          ],
          {
            duration,
            delay: Math.min(siblings.indexOf(element) % 4, 3) * 45,
            easing,
            fill: "backwards",
          },
        );
        runningAnimations.set(element, animation);
        const cleanup = () => runningAnimations.delete(element);
        animation.addEventListener("finish", cleanup, { once: true });
        animation.addEventListener("cancel", cleanup, { once: true });
      });
    },
    { threshold: 0.08 },
  );

  document
    .querySelectorAll(
      [
        ".strip-item",
        ".about-image-placeholder",
        ".about-content",
        ".stats > div",
        ".service-card",
        ".process-item",
        ".why-grid > div",
        ".values-grid > div",
        ".footer-grid > div",
      ].join(", "),
    )
    .forEach((element) => {
      // The About editorial reveal owns its text and statistics transforms.
      if (element.closest('#about') && element.matches('.about-content, .stats > div')) return;
      if (element.classList.contains('service-depth')) return;
      if (element.matches('.process-journey .process-item')) return;
      if (element.matches('.why-typography .why-grid > div')) return;
      observer.observe(element);
    });

  // Keyboard focus should never wait for a visual entrance to finish.
  document.addEventListener("focusin", (event) => {
    runningAnimations.forEach((animation, element) => {
      if (element.contains(event.target)) animation.cancel();
    });
  });

  motionPreference.addEventListener("change", (event) => {
    if (!event.matches) return;
    observer.disconnect();
    runningAnimations.forEach((animation) => animation.cancel());
    runningAnimations.clear();
  });
});

// Pointer light is event-driven; ambient loops pause when the hero is offscreen.
document.addEventListener("nexora:page-ready", () => {
  const pointerMotion = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  document.querySelectorAll(".service-card").forEach((card) => {
    if (card.classList.contains('service-depth')) return;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      card.style.removeProperty("--light-x");
      card.style.removeProperty("--light-y");
    };
    card.addEventListener(
      "pointermove",
      (event) => {
        if (!pointerMotion.matches || event.pointerType === "touch") return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const bounds = card.getBoundingClientRect();
          card.style.setProperty("--light-x", `${pointerX - bounds.left}px`);
          card.style.setProperty("--light-y", `${pointerY - bounds.top}px`);
          frame = 0;
        });
      },
      { passive: true },
    );
    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
    pointerMotion.addEventListener("change", reset);
  });

  const hero = document.querySelector(".hero");
  if (!hero) return;
  let inView = true;
  const updatePlayback = () =>
    hero.classList.toggle("motion-paused", document.hidden || !inView);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      updatePlayback();
    });
    observer.observe(hero);
  }
  document.addEventListener("visibilitychange", updatePlayback);
  updatePlayback();
});
