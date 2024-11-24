import { Profile } from 'bagad-client';
import { create } from 'zustand';
import { combine } from 'zustand/middleware';

export enum AuthStatus {
  Guest = 'GUEST',
  Authenticated = 'AUTHENTICATED',
  Unknown = 'UNKNOWN',
}

export const useProfileStore = create(
  combine(
    {
      account: undefined as undefined | null | Profile,
    },
    (set) => ({
      setAccount: (account: Profile | null) => set({ account }),
    }),
  ),
);
