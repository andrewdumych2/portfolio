(function () {
  const REVEAL_SELECTOR = [
    "[data-reveal]",
    ".intro",
    ".work__list > li",
    ".case__header",
    ".case__lede",
    ".case__figure",
    ".case__divider",
    ".case__section",
    ".case-view-toggle",
    ".case-gallery",
    ".case__source",
    ".case__back",
  ].join(", ");

  function getFadeDuration() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--page-fade-duration");
    return Number.parseFloat(value) || 0;
  }

  function getUniqueElements(selector) {
    const seen = new Set();
    return Array.from(document.querySelectorAll(selector)).filter((element) => {
      if (seen.has(element)) return false;
      seen.add(element);
      return true;
    });
  }

  function markMediaLoaded(media) {
    media.classList.add("is-loaded");
  }

  function initRevealSequence() {
    getUniqueElements(REVEAL_SELECTOR).forEach((element, index) => {
      element.setAttribute("data-reveal", "");
      element.style.setProperty("--reveal-index", index);
    });
  }

  function initMediaLoadStates() {
    document.querySelectorAll(".project-card__video, .project-card__thumb-video, .case__figure img").forEach((media) => {
      const isReady = media.tagName === "VIDEO" ? media.readyState >= 2 : media.complete;

      if (isReady) {
        markMediaLoaded(media);
        return;
      }

      const readyEvent = media.tagName === "VIDEO" ? "loadeddata" : "load";
      media.addEventListener(readyEvent, () => markMediaLoaded(media), { once: true });
      media.addEventListener("error", () => markMediaLoaded(media), { once: true });
    });
  }

  function playVideo(video) {
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(function () {});
    }
  }

  function initHoverVideos(selector, options) {
    const resetOnLeave = options && options.resetOnLeave;

    document.querySelectorAll(selector).forEach((video) => {
      const stopVideo = () => {
        video.pause();
        if (resetOnLeave) {
          video.currentTime = 0;
        }
      };

      video.controls = false;
      video.addEventListener("mouseenter", () => playVideo(video));
      video.addEventListener("mouseleave", stopVideo);
      video.addEventListener("focus", () => playVideo(video));
      video.addEventListener("blur", stopVideo);
    });
  }

  function initPageState() {
    const body = document.body;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.remove("page-is-entering");
        body.classList.add("page-is-ready");
      });
    });
  }

  function initPageTransitions() {
    const body = document.body;
    const fadeDuration = getFadeDuration();

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");

      if (!link) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const url = new URL(link.href, window.location.href);

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      if (url.href === window.location.href) return;

      event.preventDefault();
      body.classList.remove("page-is-entering", "page-is-ready");
      body.classList.add("page-is-leaving");

      window.setTimeout(() => {
        window.location.href = url.href;
      }, fadeDuration);
    });
  }

  function initStickyBackLink() {
    const stickyBackLink = document.querySelector(".case__back--sticky");
    if (!stickyBackLink) return;

    const stickyTop = 40;
    const updateStickyState = () => {
      if (window.innerWidth <= 879) {
        stickyBackLink.classList.remove("is-stuck");
        return;
      }

      const { top } = stickyBackLink.getBoundingClientRect();
      stickyBackLink.classList.toggle("is-stuck", Math.abs(top - stickyTop) < 1);
    };

    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", updateStickyState);
  }

  function initCaseViewToggles() {
    document.querySelectorAll("[data-case-view-root]").forEach((root) => {
      const buttons = Array.from(root.querySelectorAll("[data-case-view-button]"));
      const items = Array.from(root.querySelectorAll("[data-case-view-item]"));

      if (!buttons.length || !items.length) return;

      const setView = (view) => {
        root.dataset.caseView = view;

        buttons.forEach((button) => {
          const isActive = button.dataset.caseViewButton === view;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });

        items.forEach((item) => {
          const itemView = item.dataset.caseViewItem || "story";
          item.hidden = itemView !== view;
        });
      };

      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          setView(button.dataset.caseViewButton || "story");
        });
      });

      setView(root.dataset.caseView || "story");
    });
  }

  function initFloatingCaseHeaders() {
    document.querySelectorAll("[data-case-view-root]").forEach((root) => {
      const toggle = root.querySelector("[data-case-view-toggle]");
      const title = root.querySelector(".case__title");
      const backLink = document.querySelector(".case__back-link");

      if (!toggle || !title || !backLink) return;

      const floatingHeader = document.createElement("div");
      floatingHeader.className = "case__floating-header";

      const floatingBack = document.createElement("a");
      floatingBack.className = "case__floating-back";
      floatingBack.href = backLink.href;
      floatingBack.setAttribute("aria-label", "Go back");
      floatingBack.innerHTML =
        '<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 7.5H4M4 7.5L7 4.5M4 7.5L7 10.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" /></svg>';

      const floatingMain = document.createElement("div");
      floatingMain.className = "case__floating-main";

      const floatingTitle = document.createElement("p");
      floatingTitle.className = "case__floating-title";
      floatingTitle.textContent = title.textContent || "";

      const floatingToggle = toggle.cloneNode(true);
      floatingToggle.classList.add("case__floating-toggle");

      floatingMain.append(floatingTitle, floatingToggle);
      floatingHeader.append(floatingBack, floatingMain);
      document.body.appendChild(floatingHeader);

      const syncView = (view) => {
        root.dataset.caseView = view;

        root.querySelectorAll("[data-case-view-button]").forEach((button) => {
          const isActive = button.dataset.caseViewButton === view;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });

        root.querySelectorAll("[data-case-view-item]").forEach((item) => {
          const itemView = item.dataset.caseViewItem || "story";
          item.hidden = itemView !== view;
        });
      };

      floatingToggle.querySelectorAll("[data-case-view-button]").forEach((button) => {
        button.addEventListener("click", () => {
          syncView(button.dataset.caseViewButton || "story");
        });
      });

      const originalButtons = Array.from(toggle.querySelectorAll("[data-case-view-button]"));
      originalButtons.forEach((button) => {
        button.addEventListener("click", () => {
          syncView(button.dataset.caseViewButton || "story");
        });
      });

      const stickyTop = 24;
      const updateFloatingHeader = () => {
        if (window.innerWidth <= 767) {
          floatingHeader.classList.remove("is-visible");
          root.classList.remove("is-floating-header-visible");
          return;
        }

        const toggleRect = toggle.getBoundingClientRect();
        const shouldShow = toggleRect.top <= stickyTop;

        floatingHeader.classList.toggle("is-visible", shouldShow);
        root.classList.toggle("is-floating-header-visible", shouldShow);
      };

      syncView(root.dataset.caseView || "story");
      updateFloatingHeader();
      window.addEventListener("scroll", updateFloatingHeader, { passive: true });
      window.addEventListener("resize", updateFloatingHeader);
    });
  }

  function initLightbox() {
    const lightbox = document.querySelector(".lightbox");
    if (!lightbox) return;

    const lightboxCaption = lightbox.querySelector("[data-lightbox-caption]");
    const lightboxStage = lightbox.querySelector("[data-lightbox-stage]");
    const zoomInButton = lightbox.querySelector("[data-lightbox-zoom-in]");
    const zoomOutButton = lightbox.querySelector("[data-lightbox-zoom-out]");
    const closeButton = lightbox.querySelector("[data-lightbox-close]");
    const toolbar = lightbox.querySelector(".lightbox__toolbar");

    if (!lightboxCaption || !lightboxStage || !zoomInButton || !zoomOutButton || !closeButton || !toolbar) {
      return;
    }

    lightboxStage.textContent = "";

    const lightboxImage = document.createElement("img");
    lightboxImage.className = "lightbox__image";
    lightboxImage.hidden = true;

    const lightboxVideo = document.createElement("video");
    lightboxVideo.className = "lightbox__video";
    lightboxVideo.controls = true;
    lightboxVideo.playsInline = true;
    lightboxVideo.hidden = true;

    lightboxStage.append(lightboxImage, lightboxVideo);

    const toolbarSpacer = document.createElement("div");
    toolbarSpacer.className = "lightbox__toolbar-spacer";

    const prevButton = document.createElement("button");
    prevButton.className = "lightbox__button";
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", "Previous media");
    prevButton.textContent = "←";

    const nextButton = document.createElement("button");
    nextButton.className = "lightbox__button";
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Next media");
    nextButton.textContent = "→";

    toolbar.prepend(toolbarSpacer);
    toolbar.insertBefore(nextButton, zoomOutButton);
    toolbar.insertBefore(prevButton, nextButton);

    let lightboxZoom = 1;
    let activeMedia = [];
    let activeIndex = -1;

    const syncLightboxZoom = () => {
      lightboxImage.style.transform = "scale(" + lightboxZoom + ")";
      lightboxImage.classList.toggle("is-zoomed", lightboxZoom > 1);
      const isImageActive = !lightboxImage.hidden;
      zoomOutButton.disabled = !isImageActive || lightboxZoom <= 1;
      zoomInButton.disabled = !isImageActive || lightboxZoom >= 3;
    };

    const syncLightboxNavigation = () => {
      const hasMultiple = activeMedia.length > 1;
      prevButton.disabled = !hasMultiple;
      nextButton.disabled = !hasMultiple;
    };

    const getMediaCaption = (node) => node.closest("figure")?.querySelector(".case__caption")?.textContent?.trim() || "";

    const getMediaCollection = (node) => {
      const scope = node.closest(".case") || document;
      return Array.from(
        scope.querySelectorAll(".case__figure > img, .case__figure--video > video, .case-gallery__item > img, .case-gallery__item > video")
      );
    };

    const showMedia = (node) => {
      const caption = getMediaCaption(node);
      const isVideo = node.tagName === "VIDEO";

      lightboxImage.hidden = true;
      lightboxVideo.hidden = true;
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      lightboxImage.classList.remove("is-zoomed");
      lightboxVideo.pause();
      lightboxVideo.removeAttribute("src");
      lightboxVideo.removeAttribute("poster");
      lightboxVideo.load();

      if (isVideo) {
        const source = node.querySelector("source");
        lightboxVideo.poster = node.getAttribute("poster") || "";
        lightboxVideo.src = source?.src || node.currentSrc || node.src || "";
        lightboxVideo.setAttribute("aria-label", node.getAttribute("aria-label") || getMediaCaption(node) || "Expanded video");
        lightboxVideo.currentTime = 0;
        const shouldLoop = node.hasAttribute("loop");
        lightboxVideo.loop = shouldLoop;
        lightboxVideo.muted = false;
        lightboxVideo.hidden = false;
        lightboxVideo.play().catch(() => {});
      } else {
        lightboxImage.src = node.currentSrc || node.src;
        lightboxImage.alt = node.alt || "";
        lightboxImage.hidden = false;
      }

      lightboxCaption.textContent = caption;
      lightboxCaption.hidden = !caption;
      lightboxZoom = 1;
      syncLightboxZoom();
      syncLightboxNavigation();
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");

      window.setTimeout(() => {
        lightbox.hidden = true;
        lightboxImage.removeAttribute("src");
        lightboxImage.alt = "";
        lightboxImage.hidden = true;
        lightboxVideo.pause();
        lightboxVideo.removeAttribute("src");
        lightboxVideo.load();
        lightboxVideo.hidden = true;
        lightboxCaption.textContent = "";
        lightboxCaption.hidden = true;
        lightboxZoom = 1;
        activeMedia = [];
        activeIndex = -1;
        syncLightboxZoom();
        syncLightboxNavigation();
      }, 160);
    };

    const openLightbox = (node) => {
      activeMedia = getMediaCollection(node);
      activeIndex = activeMedia.indexOf(node);
      showMedia(node);
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");

      requestAnimationFrame(() => {
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
      });
    };

    const navigateMedia = (direction) => {
      if (activeMedia.length < 2 || activeIndex < 0) return;
      activeIndex = (activeIndex + direction + activeMedia.length) % activeMedia.length;
      showMedia(activeMedia[activeIndex]);
    };

    document.querySelectorAll(".case__figure > img, .case__figure--video > video, .case-gallery__item > img, .case-gallery__item > video").forEach((node) => {
      node.addEventListener("click", () => openLightbox(node));
    });

    zoomInButton.addEventListener("click", () => {
      if (lightboxImage.hidden) return;
      lightboxZoom = Math.min(3, lightboxZoom + 0.25);
      syncLightboxZoom();
    });

    zoomOutButton.addEventListener("click", () => {
      if (lightboxImage.hidden) return;
      lightboxZoom = Math.max(1, lightboxZoom - 0.25);
      syncLightboxZoom();
    });

    prevButton.addEventListener("click", () => navigateMedia(-1));
    nextButton.addEventListener("click", () => navigateMedia(1));
    closeButton.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    lightboxStage.addEventListener(
      "wheel",
      (event) => {
        if (lightboxImage.hidden) return;
        event.preventDefault();
        lightboxZoom = Math.max(1, Math.min(3, lightboxZoom + (event.deltaY < 0 ? 0.2 : -0.2)));
        syncLightboxZoom();
      },
      { passive: false }
    );

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;

      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") navigateMedia(-1);
      if (event.key === "ArrowRight") navigateMedia(1);
      if (event.key === "+" || event.key === "=") {
        if (lightboxImage.hidden) return;
        lightboxZoom = Math.min(3, lightboxZoom + 0.25);
        syncLightboxZoom();
      }
      if (event.key === "-") {
        if (lightboxImage.hidden) return;
        lightboxZoom = Math.max(1, lightboxZoom - 0.25);
        syncLightboxZoom();
      }
    });
  }

  function initImageCompare(root) {
    const leftImage = root.querySelector('[data-compare-image="left"]');
    const rightImage = root.querySelector('[data-compare-image="right"]');
    const leftLabel = root.querySelector('[data-compare-label="left"]');
    const rightLabel = root.querySelector('[data-compare-label="right"]');
    const mobileLeftImage = root.querySelector('[data-compare-mobile-image="left"]');
    const mobileRightImage = root.querySelector('[data-compare-mobile-image="right"]');
    const mobileLeftLabel = root.querySelector('[data-compare-mobile-label="left"]');
    const mobileRightLabel = root.querySelector('[data-compare-mobile-label="right"]');
    const mobileFrame = root.querySelector(".image-compare__mobile-frame");
    const mobileOverlay = root.querySelector("[data-compare-mobile-overlay]");
    const mobileDivider = root.querySelector("[data-compare-mobile-divider]");
    const mobileHandle = root.querySelector("[data-compare-mobile-handle]");

    if (!leftImage || !rightImage || !leftLabel || !rightLabel) return;

    const defaultZoom = Number.parseFloat(root.dataset.defaultZoom || root.dataset.zoom || "3");
    const minZoom = Number.parseFloat(root.dataset.minZoom || "1");
    const maxZoom = Number.parseFloat(root.dataset.maxZoom || "5");
    const zoomStep = Number.parseFloat(root.dataset.zoomStep || "0.2");
    const aspectRatio = root.dataset.aspectRatio || "1 / 1";
    const interactionInsetValue =
      root.dataset.interactionInset || getComputedStyle(root).getPropertyValue("--compare-interaction-inset");
    const interactionInset = Number.parseFloat(interactionInsetValue || "0.12");
    let x = 0.5;
    let y = 0.5;
    let split = 0.5;
    let zoom = defaultZoom;
    let isDragging = false;
    let gestureStartZoom = defaultZoom;

    root.style.setProperty("--compare-aspect-ratio", aspectRatio);

    leftImage.src = root.dataset.leftImage || "";
    rightImage.src = root.dataset.rightImage || "";
    leftLabel.textContent = root.dataset.leftLabel || "Left";
    rightLabel.textContent = root.dataset.rightLabel || "Right";

    if (mobileLeftImage) mobileLeftImage.src = root.dataset.leftImage || "";
    if (mobileRightImage) mobileRightImage.src = root.dataset.rightImage || "";
    if (mobileLeftLabel) mobileLeftLabel.textContent = root.dataset.leftLabel || "Left";
    if (mobileRightLabel) mobileRightLabel.textContent = root.dataset.rightLabel || "Right";

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    zoom = clamp(defaultZoom, minZoom, maxZoom);

    const setZoom = (nextZoom) => {
      zoom = clamp(nextZoom, minZoom, maxZoom);
      applyPan();
    };

    const mapWithinInset = (value) => {
      const inset = clamp(interactionInset, 0, 0.45);
      const span = Math.max(0.0001, 1 - inset * 2);
      return clamp((value - inset) / span, 0, 1);
    };

    const getCoverMetrics = (image, frame, extraScale) => {
      const naturalWidth = image.naturalWidth || frame.clientWidth || 1;
      const naturalHeight = image.naturalHeight || frame.clientHeight || 1;
      const frameWidth = frame.clientWidth || 1;
      const frameHeight = frame.clientHeight || 1;
      const coverScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
      const renderedWidth = naturalWidth * coverScale * extraScale;
      const renderedHeight = naturalHeight * coverScale * extraScale;

      return {
        frameWidth,
        frameHeight,
        renderedWidth,
        renderedHeight,
      };
    };

    const layoutDesktopImage = (image, viewport, panX, panY) => {
      const metrics = getCoverMetrics(image, viewport, zoom);
      const maxOffsetX = Math.max(0, metrics.renderedWidth - metrics.frameWidth);
      const maxOffsetY = Math.max(0, metrics.renderedHeight - metrics.frameHeight);
      const offsetX = -panX * maxOffsetX;
      const offsetY = -panY * maxOffsetY;

      image.style.width = metrics.renderedWidth + "px";
      image.style.height = metrics.renderedHeight + "px";
      image.style.transform = "translate(" + offsetX + "px, " + offsetY + "px)";
    };

    const layoutMobileImage = (image, frame) => {
      const metrics = getCoverMetrics(image, frame, 1);
      const offsetX = (metrics.frameWidth - metrics.renderedWidth) / 2;
      const offsetY = (metrics.frameHeight - metrics.renderedHeight) / 2;

      image.style.width = metrics.renderedWidth + "px";
      image.style.height = metrics.renderedHeight + "px";
      image.style.transform = "translate(" + offsetX + "px, " + offsetY + "px)";
    };

    const applyPan = () => {
      const viewports = root.querySelectorAll(".image-compare__viewport");
      if (!viewports.length) return;

      if (viewports[0]) layoutDesktopImage(leftImage, viewports[0], x, y);
      if (viewports[1]) layoutDesktopImage(rightImage, viewports[1], x, y);
    };

    const updateFromPointer = (event) => {
      if (window.matchMedia("(max-width: 767px)").matches) return;

      const pane = event.currentTarget;
      const rect = pane.getBoundingClientRect();
      const rawX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const rawY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      x = mapWithinInset(rawX);
      y = mapWithinInset(rawY);
      applyPan();
    };

    root.querySelectorAll(".image-compare__viewport").forEach((pane) => {
      pane.addEventListener("mousemove", updateFromPointer);
      pane.addEventListener(
        "wheel",
        (event) => {
          if (window.matchMedia("(max-width: 767px)").matches) return;
          if (!event.ctrlKey) return;

          event.preventDefault();
          setZoom(zoom - event.deltaY * zoomStep * 0.01);
        },
        { passive: false }
      );

      pane.addEventListener("gesturestart", (event) => {
        if (window.matchMedia("(max-width: 767px)").matches) return;
        event.preventDefault();
        gestureStartZoom = zoom;
      });

      pane.addEventListener("gesturechange", (event) => {
        if (window.matchMedia("(max-width: 767px)").matches) return;
        event.preventDefault();
        setZoom(gestureStartZoom * event.scale);
      });
    });

    const applyMobileSplit = () => {
      if (!mobileOverlay || !mobileDivider) return;

      const percentage = split * 100;
      mobileOverlay.style.width = percentage + "%";
      mobileDivider.style.left = percentage + "%";
    };

    const applyMobileLayout = () => {
      if (mobileFrame && mobileLeftImage) layoutMobileImage(mobileLeftImage, mobileFrame);
      if (mobileFrame && mobileRightImage) layoutMobileImage(mobileRightImage, mobileFrame);
    };

    const updateMobileSplit = (clientX) => {
      if (!mobileFrame) return;

      const rect = mobileFrame.getBoundingClientRect();
      split = clamp((clientX - rect.left) / rect.width, 0, 1);
      applyMobileSplit();
    };

    if (mobileHandle && mobileFrame) {
      mobileHandle.addEventListener("pointerdown", (event) => {
        if (window.matchMedia("(min-width: 768px)").matches) return;

        isDragging = true;
        mobileHandle.setPointerCapture(event.pointerId);
        updateMobileSplit(event.clientX);
      });

      mobileHandle.addEventListener("pointermove", (event) => {
        if (!isDragging) return;
        updateMobileSplit(event.clientX);
      });

      const stopDragging = (event) => {
        if (!isDragging) return;
        isDragging = false;

        if (event && mobileHandle.hasPointerCapture(event.pointerId)) {
          mobileHandle.releasePointerCapture(event.pointerId);
        }
      };

      mobileHandle.addEventListener("pointerup", stopDragging);
      mobileHandle.addEventListener("pointercancel", stopDragging);
    }

    [leftImage, rightImage, mobileLeftImage, mobileRightImage].forEach((image) => {
      if (!image) return;

      image.addEventListener(
        "load",
        () => {
          applyPan();
          applyMobileLayout();
        },
        { once: true }
      );
    });

    applyPan();
    applyMobileLayout();
    applyMobileSplit();
    window.addEventListener("resize", () => {
      applyPan();
      applyMobileLayout();
      applyMobileSplit();
    });
  }

  function initComparisons() {
    document.querySelectorAll("[data-image-compare]").forEach(initImageCompare);
  }

  function initCertificateCards() {
    document.querySelectorAll("[data-certificate-card]").forEach((card) => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const sensitivity = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-drag-sensitivity")) || 0.24;
      const hoverTilt = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-hover-tilt")) || 5;
      const maxRotateX = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-max-rotate-x")) || 18;
      const maxRotateY = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-max-rotate-y")) || 30;
      const inertiaStrength = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-inertia")) || 1;
      const damping = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-damping")) || 0.92;
      const inertiaFinishThreshold =
        Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-inertia-finish-threshold")) || 0.018;
      const returnDelay = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-return-delay")) || 120;
      const resetSpeed = Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-reset-speed")) || 0.075;
      const highlightIntensity =
        Number.parseFloat(getComputedStyle(card).getPropertyValue("--certificate-card-highlight-intensity")) || 0.18;

      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
      const setHighlight = (x, y, opacity) => {
        card.style.setProperty("--certificate-highlight-x", (x * 100).toFixed(2) + "%");
        card.style.setProperty("--certificate-highlight-y", (y * 100).toFixed(2) + "%");
        card.style.setProperty("--certificate-highlight-opacity", opacity.toFixed(3));
      };

      let currentX = 0;
      let currentY = 0;
      let targetX = 0;
      let targetY = 0;
      let velocityX = 0;
      let velocityY = 0;
      let lastPointerX = 0;
      let lastPointerY = 0;
      let hoverX = 0.5;
      let hoverY = 0.5;
      let isHovering = false;
      let isDragging = false;
      let isInertiaActive = false;
      let frameId = 0;
      let inertiaEndTime = 0;

      const syncCard = () => {
        card.style.setProperty("--certificate-rotate-x", currentX.toFixed(3) + "deg");
        card.style.setProperty("--certificate-rotate-y", currentY.toFixed(3) + "deg");
      };

      const startFrame = () => {
        if (frameId) return;
        frameId = window.requestAnimationFrame(tick);
      };

      const tick = () => {
        if (!isDragging) {
          if (isInertiaActive) {
            targetX = clamp(targetX + velocityX * inertiaStrength, -maxRotateX, maxRotateX);
            targetY = clamp(targetY + velocityY * inertiaStrength, -maxRotateY, maxRotateY);
            velocityX *= damping;
            velocityY *= damping;

            if (Math.abs(velocityX) < inertiaFinishThreshold && Math.abs(velocityY) < inertiaFinishThreshold) {
              velocityX = 0;
              velocityY = 0;
              isInertiaActive = false;
              inertiaEndTime = window.performance.now();
            }
          } else if (window.performance.now() - inertiaEndTime >= returnDelay) {
            if (isHovering && !prefersReducedMotion) {
              targetX += (clamp((0.5 - hoverY) * hoverTilt * 2, -hoverTilt, hoverTilt) - targetX) * 0.18;
              targetY += (clamp((hoverX - 0.5) * hoverTilt * 2, -hoverTilt, hoverTilt) - targetY) * 0.18;
            } else {
              targetX += (0 - targetX) * resetSpeed;
              targetY += (0 - targetY) * resetSpeed;
            }
          }
        }

        const followStrength = isDragging ? 0.34 : 0.16;
        currentX += (targetX - currentX) * followStrength;
        currentY += (targetY - currentY) * followStrength;
        syncCard();

        const shouldContinue =
          isDragging ||
          isInertiaActive ||
          (isHovering && !prefersReducedMotion) ||
          Math.abs(currentX) > 0.01 ||
          Math.abs(currentY) > 0.01 ||
          Math.abs(targetX) > 0.01 ||
          Math.abs(targetY) > 0.01 ||
          Math.abs(velocityX) > inertiaFinishThreshold ||
          Math.abs(velocityY) > inertiaFinishThreshold;

        if (shouldContinue) {
          frameId = window.requestAnimationFrame(tick);
        } else {
          frameId = 0;
        }
      };

      const updateHoverPosition = (event) => {
        const rect = card.getBoundingClientRect();
        hoverX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        hoverY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        setHighlight(hoverX, hoverY, isDragging ? highlightIntensity * 1.15 : highlightIntensity);
      };

      card.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") return;
        isHovering = true;
        updateHoverPosition(event);
        startFrame();
      });

      card.addEventListener("pointermove", (event) => {
        updateHoverPosition(event);

        if (!isDragging) {
          startFrame();
          return;
        }

        const deltaX = event.clientX - lastPointerX;
        const deltaY = event.clientY - lastPointerY;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;

        targetY = clamp(targetY + deltaX * sensitivity, -maxRotateY, maxRotateY);
        targetX = clamp(targetX - deltaY * sensitivity, -maxRotateX, maxRotateX);
        velocityY = clamp(deltaX * sensitivity * 0.22, -2.4, 2.4);
        velocityX = clamp(-deltaY * sensitivity * 0.22, -1.8, 1.8);
        startFrame();
      });

      const endDrag = (event) => {
        if (!isDragging) return;
        isDragging = false;
        isInertiaActive = !prefersReducedMotion && (Math.abs(velocityX) > 0.001 || Math.abs(velocityY) > 0.001);
        inertiaEndTime = isInertiaActive ? 0 : window.performance.now();
        card.classList.remove("is-dragging");
        if (event && card.hasPointerCapture(event.pointerId)) {
          card.releasePointerCapture(event.pointerId);
        }
        if (!isHovering) {
          setHighlight(hoverX, hoverY, 0);
        } else {
          setHighlight(hoverX, hoverY, highlightIntensity);
        }
        startFrame();
      };

      const forceRelease = (event) => {
        if (!isDragging) return;
        endDrag(event);
        isHovering = false;
        setHighlight(hoverX, hoverY, 0);
        if (!isInertiaActive) {
          inertiaEndTime = window.performance.now();
        }
        startFrame();
      };

      card.addEventListener("dragstart", (event) => {
        event.preventDefault();
      });

      card.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        isDragging = true;
        isHovering = true;
        isInertiaActive = false;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        velocityX = 0;
        velocityY = 0;
        card.classList.add("is-dragging");
        card.setPointerCapture(event.pointerId);
        updateHoverPosition(event);
        setHighlight(hoverX, hoverY, highlightIntensity * 1.15);
        startFrame();
      });

      card.addEventListener("pointerup", endDrag);
      card.addEventListener("pointercancel", endDrag);
      card.addEventListener("lostpointercapture", forceRelease);

      card.addEventListener("pointerleave", () => {
        if (isDragging) return;
        isHovering = false;
        setHighlight(hoverX, hoverY, 0);
        if (!isInertiaActive) {
          inertiaEndTime = window.performance.now();
        }
        startFrame();
      });

      window.addEventListener("mouseup", forceRelease);
      window.addEventListener("blur", forceRelease);

      syncCard();
      setHighlight(0.5, 0.5, 0);
    });
  }

  function init() {
    initRevealSequence();
    initMediaLoadStates();
    initHoverVideos(".project-card__media video, .project-card__thumb video", { resetOnLeave: false });
    initHoverVideos(".case__figure--video video", { resetOnLeave: true });
    initPageState();
    initPageTransitions();
    initStickyBackLink();
    initCaseViewToggles();
    initFloatingCaseHeaders();
    initLightbox();
    initComparisons();
    initCertificateCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
