// SyncBoard Bridge - Content Script
// Runs in EVERY frame (including nested iframes) to relay media events.
// Architecture: parent-relay chain. Each frame relays UP to window.parent
// and DOWN to its children. No direct window.top access needed.

(function() {
  // Don't run on the top-level SyncBoard page itself
  if (window === window.top) return;

  let videoElement = null;
  let ignoreNextEvent = false;
  let lastEventTime = 0;

  // Debounce: don't fire duplicate events within 300ms
  function shouldThrottle() {
    const now = Date.now();
    if (now - lastEventTime < 300) return true;
    lastEventTime = now;
    return false;
  }

  function sendUp(data) {
    try {
      window.parent.postMessage(data, '*');
    } catch (e) {
      // Silently fail if parent is inaccessible
    }
  }

  function sendDown(data) {
    // Relay to all child iframes
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow.postMessage(data, '*');
        } catch (e) {}
      });
    } catch (e) {}

    // Also try window.frames
    try {
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage(data, '*');
        } catch (e) {}
      }
    } catch (e) {}
  }

  function setupVideoListeners(video) {
    // Remove old listeners if re-attaching
    video._syncboardBound = true;

    video.addEventListener('play', () => {
      if (ignoreNextEvent) return;
      if (shouldThrottle()) return;
      sendUp({
        type: 'SYNCBOARD_MEDIA_EVENT',
        action: 'play',
        time: video.currentTime
      });
    });

    video.addEventListener('pause', () => {
      if (ignoreNextEvent) return;
      if (shouldThrottle()) return;
      sendUp({
        type: 'SYNCBOARD_MEDIA_EVENT',
        action: 'pause',
        time: video.currentTime
      });
    });

    video.addEventListener('seeked', () => {
      if (ignoreNextEvent) return;
      if (shouldThrottle()) return;
      sendUp({
        type: 'SYNCBOARD_MEDIA_EVENT',
        action: 'seek',
        time: video.currentTime
      });
    });
  }

  function findAndBindVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video._syncboardBound) {
        videoElement = video;
        setupVideoListeners(video);
        sendUp({ type: 'SYNCBOARD_BRIDGE_READY' });
      }
    });
  }

  // Run immediately
  findAndBindVideos();

  // Also observe DOM for dynamically loaded videos
  const observer = new MutationObserver(() => {
    findAndBindVideos();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Listen for messages
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    // --- COMMANDS coming DOWN from SyncBoard ---
    if (event.data.type === 'SYNCBOARD_MEDIA_COMMAND') {
      // Always relay down to children first
      sendDown(event.data);

      // Then try to apply locally if we have a video
      if (videoElement) {
        const { action, time } = event.data;

        ignoreNextEvent = true;

        try {
          if (action === 'play') {
            if (typeof time === 'number' && Math.abs(videoElement.currentTime - time) > 1) {
              videoElement.currentTime = time;
            }
            videoElement.play().catch(() => {});
          } else if (action === 'pause') {
            if (typeof time === 'number' && Math.abs(videoElement.currentTime - time) > 1) {
              videoElement.currentTime = time;
            }
            videoElement.pause();
          } else if (action === 'seek') {
            if (typeof time === 'number') {
              videoElement.currentTime = time;
            }
          }
        } catch (e) {}

        setTimeout(() => { ignoreNextEvent = false; }, 500);
      }
    }

    // --- EVENTS coming UP from deeper nested iframes ---
    // If a child iframe sent a SYNCBOARD_MEDIA_EVENT, relay it upward
    if (event.data.type === 'SYNCBOARD_MEDIA_EVENT') {
      // Only relay if it came from a child (not from ourselves)
      if (event.source !== window) {
        sendUp(event.data);
      }
    }

    // --- BRIDGE_READY from deeper nested iframes ---
    if (event.data.type === 'SYNCBOARD_BRIDGE_READY') {
      if (event.source !== window) {
        sendUp(event.data);
      }
    }
  });
})();
