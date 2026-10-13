export interface LoginNotice {
  readonly message: string;
  readonly retry: boolean;
}

export const LOGIN_NOTICES: ReadonlyMap<string, LoginNotice> = new Map([
  ['expired', {
    message: 'Sesja wygasła. Zaloguj się ponownie.',
    retry: false,
  }],
  ['denied', {
    message: 'Nie masz dostępu do Daylo.',
    retry: false,
  }],
  ['failed', {
    message: 'Nie udało się zalogować. Spróbuj ponownie.',
    retry: false,
  }],
  ['connection', {
    message: 'Nie udało się połączyć. Spróbuj ponownie.',
    retry: true,
  }],
]);
