import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps in-app paths, including query strings', () => {
    expect(safeReturnUrl('/invitations/abc?accept=1')).toBe('/invitations/abc?accept=1');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example'])(
    'falls back to home for %s',
    (value) => {
      expect(safeReturnUrl(value)).toBe('/');
    },
  );
});
