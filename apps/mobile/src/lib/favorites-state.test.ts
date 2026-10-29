import { updateFavoriteIds } from './favorites-state';

describe('updateFavoriteIds', () => {
  it('adds without mutating the current set', () => {
    const current = new Set(['one']);
    const next = updateFavoriteIds(current, 'two', true);
    expect([...current]).toEqual(['one']);
    expect([...next]).toEqual(['one', 'two']);
  });

  it('removes idempotently', () => {
    const next = updateFavoriteIds(new Set(['one', 'two']), 'one', false);
    expect([...next]).toEqual(['two']);
    expect([...updateFavoriteIds(next, 'one', false)]).toEqual(['two']);
  });
});
