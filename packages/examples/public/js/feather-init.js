const timer = setInterval(() => {
  if (globalThis.feather == null) {
    return;
  }

  globalThis.feather.replace();

  clearInterval(timer);
}, 50);
