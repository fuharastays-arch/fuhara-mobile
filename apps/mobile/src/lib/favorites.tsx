import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { loadFavoriteIds, saveFavorite, unsaveFavorite } from './api';
import { updateFavoriteIds } from './favorites-state';
import { useSession } from './session';

type FavoritesState = {
  ids: ReadonlySet<string>;
  loading: boolean;
  isBusy: (propertyId: string) => boolean;
  refresh: () => Promise<void>;
  save: (propertyId: string) => Promise<void>;
  toggle: (propertyId: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const idsRef = useRef(ids);
  const busyRef = useRef(busyIds);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    try {
      setIds(new Set(await loadFavoriteIds()));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setBusyIds(new Set());
    if (!user) {
      setIds(new Set());
      setLoading(false);
      return;
    }
    refresh().catch(() => setLoading(false));
  }, [refresh, user]);

  const setBusy = useCallback((propertyId: string, busy: boolean) => {
    const next = updateFavoriteIds(busyRef.current, propertyId, busy);
    busyRef.current = next;
    setBusyIds(next);
  }, []);

  const setSaved = useCallback(
    async (propertyId: string, saved: boolean) => {
      if (!user) throw new Error('Sign in to save stays.');
      if (busyRef.current.has(propertyId)) return;
      const previous = idsRef.current.has(propertyId);
      if (previous === saved) return;
      setBusy(propertyId, true);
      setIds((current) => updateFavoriteIds(current, propertyId, saved));
      try {
        if (saved) await saveFavorite(user.id, propertyId);
        else await unsaveFavorite(user.id, propertyId);
      } catch (error) {
        setIds((current) => updateFavoriteIds(current, propertyId, previous));
        throw error;
      } finally {
        setBusy(propertyId, false);
      }
    },
    [setBusy, user],
  );

  const value = useMemo<FavoritesState>(
    () => ({
      ids,
      loading,
      isBusy: (propertyId) => busyIds.has(propertyId),
      refresh,
      save: (propertyId) => setSaved(propertyId, true),
      toggle: (propertyId) => setSaved(propertyId, !ids.has(propertyId)),
    }),
    [busyIds, ids, loading, refresh, setSaved],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value)
    throw new Error('useFavorites must be used inside FavoritesProvider.');
  return value;
}
