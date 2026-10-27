// Shared settings for the slideshow (present.html) and the remote (connect.html).
window.MATH_MATCH = {
  server: 'wss://math-project-fxdc.onrender.com/ws', // Render relay
  defaultRoom: 'math-match',
  totalSlides: 7,      // must match the number of .slide sections in present.html
  questionCount: 3,    // questions are assets/q1..qN-question.svg / -answer.svg
  defaultSeconds: 60,

  // Render's free tier sleeps when idle. A plain HTTP request wakes it up
  // while the page is still loading, so the WebSocket connects sooner.
  wake(wsUrl) {
    try {
      const url = new URL(wsUrl);
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      url.pathname = '/';
      url.search = '';
      fetch(url.href, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
    } catch {}
  }
};
