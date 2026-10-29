self.addEventListener('push', (event) => {
  let payload = { title: 'Campus Hub', body: 'You have a new update.', url: '/' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; }
  catch { if (event.data) payload.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(payload.title || 'Campus Hub', {
    body: payload.body || 'You have a new update.',
    icon: '/icon.svg', badge: '/icon.svg', tag: payload.tag || 'campus-hub-update',
    data: { url: payload.url || '/' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(destination);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(destination);
  })());
});
