// Shared settings for the slideshow (present.html) and the remote (connect.html).
window.MATH_MATCH = {
  server: 'wss://math-project-fxdc.onrender.com/ws', // Render relay
  defaultRoom: 'math-match',
  totalSlides: 7,      // must match the number of .slide sections in present.html
  questionCount: 19,
  questions: [
    'addition_01', 'addition_02', 'addition_03', 'addition_04', 'addition_05',
    'addition_06', 'addition_07', 'addition_08', 'addition_09', 'addition_10',
    'matching_01', 'matching_02', 'matching_03', 'matching_04', 'matching_05',
    'matching_06', 'multiplication_01', 'multiplication_02', 'multiplication_03'
  ],
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
