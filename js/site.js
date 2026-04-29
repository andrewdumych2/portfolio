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
    ensureVideoSource(video);
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(function () {});
    }
  }

  function ensureVideoSource(video) {
    if (video.dataset.videoLoaded === "true") return;

    const sources = video.querySelectorAll("source[data-src]");
    if (!sources.length) {
      video.dataset.videoLoaded = "true";
      return;
    }

    sources.forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });

    video.dataset.videoLoaded = "true";
    video.load();
  }

  function initHoverVideos(selector, options) {
    const resetOnLeave = options && options.resetOnLeave;

    document.querySelectorAll(selector).forEach((video) => {
      const stopVideo = () => {
        video.pause();
        if (resetOnLeave && video.readyState > 0) {
          video.currentTime = 0;
        }
      };

      video.controls = false;
      video.preload = video.getAttribute("preload") || "none";
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

  function initLightbox() {
    const lightbox = document.querySelector(".lightbox");
    if (!lightbox) return;

    const lightboxStage = lightbox.querySelector("[data-lightbox-stage]");
    const toolbar = lightbox.querySelector(".lightbox__toolbar");
    const lightboxCaption = lightbox.querySelector("[data-lightbox-caption]");
    const imageNodes = Array.from(document.querySelectorAll(".case__figure > img, .case-gallery__item > img"));

    if (!lightboxStage || !imageNodes.length) {
      return;
    }

    if (toolbar) toolbar.hidden = true;
    if (lightboxCaption) lightboxCaption.hidden = true;

    lightboxStage.textContent = "";

    const lightboxImage = document.createElement("img");
    lightboxImage.className = "lightbox__image";
    lightboxImage.hidden = true;
    lightboxStage.append(lightboxImage);

    let activeSource = null;
    let isOpen = false;
    let isAnimating = false;
    let activeAnimation = null;

    const easingEnter = "cubic-bezier(0.23, 1, 0.32, 1)";
    const easingExit = "cubic-bezier(0.32, 0.72, 0, 1)";

    const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const getRect = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    };

    const getOverlayRect = () => ({
      top: Number.parseFloat(lightboxImage.style.top || "0"),
      left: Number.parseFloat(lightboxImage.style.left || "0"),
      width: Number.parseFloat(lightboxImage.style.width || "0"),
      height: Number.parseFloat(lightboxImage.style.height || "0"),
    });

    const applyRect = (rect) => {
      if (!rect) return;
      lightboxImage.style.top = rect.top + "px";
      lightboxImage.style.left = rect.left + "px";
      lightboxImage.style.width = rect.width + "px";
      lightboxImage.style.height = rect.height + "px";
    };

    const getTargetRect = (node) => {
      const fallbackRect = getRect(node);
      const naturalWidth = node.naturalWidth || fallbackRect?.width || 1;
      const naturalHeight = node.naturalHeight || fallbackRect?.height || 1;
      const padding = window.innerWidth <= 767 ? 16 : 28;
      const maxWidth = Math.max(0, window.innerWidth - padding * 2);
      const maxHeight = Math.max(0, window.innerHeight - padding * 2);
      const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
      const width = Math.round(naturalWidth * scale);
      const height = Math.round(naturalHeight * scale);

      return {
        top: Math.round((window.innerHeight - height) / 2),
        left: Math.round((window.innerWidth - width) / 2),
        width,
        height,
      };
    };

    const getBorderRadius = (node, fallback) => getComputedStyle(node).borderRadius || fallback;
    const nextFrame = () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
      });

    const prepareOverlayImage = async (node) => {
      const src = node.currentSrc || node.src;
      lightboxImage.src = src;
      lightboxImage.alt = node.alt || "";

      if ("decode" in lightboxImage) {
        try {
          await lightboxImage.decode();
          return;
        } catch {}
      }

      if (lightboxImage.complete) return;

      await new Promise((resolve) => {
        const finish = () => {
          lightboxImage.removeEventListener("load", finish);
          lightboxImage.removeEventListener("error", finish);
          resolve();
        };

        lightboxImage.addEventListener("load", finish, { once: true });
        lightboxImage.addEventListener("error", finish, { once: true });
      });
    };

    const cancelRunningEffects = () => {
      if (activeAnimation) {
        activeAnimation.cancel();
        activeAnimation = null;
      }
    };

    const revealSource = () => {
      if (activeSource) {
        activeSource.classList.remove("is-lightbox-source-hidden");
      }
    };

    const cleanupLightbox = () => {
      cancelRunningEffects();
      revealSource();
      lightbox.classList.remove("is-open");
      lightbox.style.backgroundColor = "";
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      lightboxImage.hidden = true;
      lightboxImage.removeAttribute("src");
      lightboxImage.alt = "";
      lightboxImage.style.opacity = "1";
      lightboxImage.style.borderRadius = "12px";
      lightboxImage.style.top = "0px";
      lightboxImage.style.left = "0px";
      lightboxImage.style.width = "0px";
      lightboxImage.style.height = "0px";
      activeSource = null;
      isOpen = false;
      isAnimating = false;
    };

    const removeDismissListeners = () => {
      window.removeEventListener("scroll", handleScrollDismiss);
      window.removeEventListener("wheel", handleScrollDismiss);
      window.removeEventListener("touchmove", handleScrollDismiss);
      window.removeEventListener("resize", handleScrollDismiss);
      document.removeEventListener("keydown", handleKeyDismiss);
    };

    const addDismissListeners = () => {
      window.addEventListener("scroll", handleScrollDismiss, { passive: true });
      window.addEventListener("wheel", handleScrollDismiss, { passive: true });
      window.addEventListener("touchmove", handleScrollDismiss, { passive: true });
      window.addEventListener("resize", handleScrollDismiss, { passive: true });
      document.addEventListener("keydown", handleKeyDismiss);
    };

    const animateOverlay = (fromRect, toRect, options) => {
      const { duration, easing, fromRadius, toRadius, fadeOut } = options;

      applyRect(fromRect);
      lightboxImage.style.borderRadius = fromRadius;
      lightboxImage.style.opacity = fadeOut ? "1" : "1";

      if (prefersReducedMotion()) {
        applyRect(toRect);
        lightboxImage.style.borderRadius = toRadius;
        lightboxImage.style.opacity = fadeOut ? "0" : "1";
        return Promise.resolve();
      }

      activeAnimation = lightboxImage.animate(
        [
          {
            top: fromRect.top + "px",
            left: fromRect.left + "px",
            width: fromRect.width + "px",
            height: fromRect.height + "px",
            borderRadius: fromRadius,
            opacity: 1,
          },
          {
            top: toRect.top + "px",
            left: toRect.left + "px",
            width: toRect.width + "px",
            height: toRect.height + "px",
            borderRadius: toRadius,
            opacity: fadeOut ? 0 : 1,
          },
        ],
        {
          duration,
          easing,
          fill: "forwards",
        }
      );

      return activeAnimation.finished
        .catch(() => {})
        .then(() => {
          activeAnimation = null;
          applyRect(toRect);
          lightboxImage.style.borderRadius = toRadius;
          lightboxImage.style.opacity = fadeOut ? "0" : "1";
        });
    };

    function handleKeyDismiss(event) {
      if (event.key === "Escape") {
        closeLightbox("keyboard");
      }
    }

    function handleScrollDismiss() {
      closeLightbox("scroll");
    }

    const closeLightboxImmediately = () => {
      cleanupLightbox();
    };

    const openLightbox = async (node) => {
      if (isAnimating || activeSource === node) return;

      cancelRunningEffects();
      revealSource();

      const startRect = getRect(node);
      if (!startRect || !startRect.width || !startRect.height) return;

      activeSource = node;
      isAnimating = true;
      isOpen = false;

      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      lightboxImage.hidden = false;
      lightboxImage.style.opacity = "1";
      applyRect(startRect);
      const sourceRadius = getBorderRadius(node, "8px");
      const targetRect = getTargetRect(node);
      lightboxImage.style.borderRadius = sourceRadius;

      await prepareOverlayImage(node);
      if (activeSource !== node) return;

      await nextFrame();
      if (activeSource !== node) return;

      node.classList.add("is-lightbox-source-hidden");
      lightbox.classList.add("is-open");
      addDismissListeners();

      await nextFrame();
      if (activeSource !== node) return;

      animateOverlay(startRect, targetRect, {
        duration: 280,
        easing: easingEnter,
        fromRadius: sourceRadius,
        toRadius: "12px",
        fadeOut: false,
      }).then(() => {
        if (activeSource !== node) return;
        isAnimating = false;
        isOpen = true;
      });
    };

    const closeLightbox = (reason) => {
      if (!activeSource || (!isOpen && !isAnimating)) return;

      removeDismissListeners();
      cancelRunningEffects();

      if (reason === "scroll") {
        closeLightboxImmediately();
        return;
      }

      const source = activeSource;
      const currentRect = getOverlayRect();
      const sourceRadius = getBorderRadius(source, "8px");

      isOpen = false;
      isAnimating = true;
      lightbox.classList.remove("is-open");

      const endRect = getRect(source) || currentRect;

      animateOverlay(currentRect, endRect, {
        duration: 220,
        easing: easingExit,
        fromRadius: "12px",
        toRadius: sourceRadius,
        fadeOut: false,
      }).then(() => {
        cleanupLightbox();
      });
    };

    lightboxImage.addEventListener("click", () => closeLightbox("click"));

    imageNodes.forEach((node) => {
      node.addEventListener("click", () => openLightbox(node));
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
    initHoverVideos(".project-card__media video, .project-card__thumb video", { resetOnLeave: true });
    initHoverVideos(".case__figure--video video", { resetOnLeave: true });
    initPageState();
    initPageTransitions();
    initStickyBackLink();
    initCaseViewToggles();
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
