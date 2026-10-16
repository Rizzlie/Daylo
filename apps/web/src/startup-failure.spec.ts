import { showStartupFailure } from './startup-failure';

it('keeps startup failure readable and retries once without exposing internal errors', () => {
  const host = document.createElement('div');
  host.innerHTML =
    '<p id="startup-status" role="status">Loading</p><button id="startup-retry" hidden>Retry</button>';
  document.body.append(host);
  try {
    const retry = vi.fn();
    showStartupFailure(document, retry);
    const button = host.querySelector('button') as HTMLButtonElement;
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Nie udało się wczytać konfiguracji',
    );
    expect(button.hidden).toBe(false);
    button.click();
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
  } finally {
    host.remove();
  }
});
