// hooks/useProfile.ts
import { LoginType, MyProfile } from 'bagad-client';
import { useEffect, useState } from 'react';

export interface CachedProfile {
  image: string | null;
  data: MyProfile;
  loginType: LoginType;
  timestamp: number;
}

interface UseProfile {
  profileData: CachedProfile | undefined,
  loaded: boolean;
  cacheProfile: (profile: MyProfile, loginType: LoginType) => Promise<void>;
  clearProfile: () => void;
}

const CACHE_KEY = 'cached_profile';

export default function useCachedProfile(): UseProfile {
  const [stateProfile, setStateProfile] = useState<CachedProfile | undefined>();
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const cachedProfile = JSON.parse(cached) as CachedProfile;
      setStateProfile(cachedProfile);
      setLoaded(true);
    } else {
      setLoaded(true);
    }
  }, []);

  const cacheProfile = async (
    profile: MyProfile,
    loginType: LoginType,
  ): Promise<void> => {
    try {
      let base64Image: string | null = null;

      if (profile.pictureUrl) {
        const response = await fetch(profile.pictureUrl);
        const blob = await response.blob();
        base64Image = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const cacheData: CachedProfile = {
        image: base64Image,
        data: profile,
        loginType,
        timestamp: Date.now(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setStateProfile(cacheData);
    } catch (error) {
      console.error('Failed to cache profile:', error);
    }
  };

  const clearProfile = () => {
    localStorage.removeItem(CACHE_KEY);
    setStateProfile(undefined);
  };

  return {
    profileData: stateProfile,
    loaded,
    cacheProfile,
    clearProfile,
  };
}
