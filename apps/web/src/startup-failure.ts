export function showStartupFailure(
  document: Document,
  retry = () => window.location.reload(),
): void {
  const status = document.getElementById('startup-status');
  const button = document.getElementById('startup-retry');
  if (status) {
    status.textContent =
      'Nie udało się wczytać konfiguracji Daylo. Sprawdź połączenie i spróbuj ponownie.';
    status.setAttribute('role', 'alert');
  }
  if (button instanceof HTMLButtonElement) {
    button.hidden = false;
    button.addEventListener(
      'click',
      () => {
        button.disabled = true;
        retry();
      },
      { once: true },
    );
  }
}
