// hooks/useProfile.ts
import { LoginType, Profile } from 'bagad-client';
import { useEffect, useState } from 'react';

interface CachedProfile {
  image: string | null;
  data: Profile;
  loginType: LoginType;
  email: string;
  timestamp: number;
}

interface ProfileState {
  image: string | null;
  data: Profile | null;
  loginType: LoginType | null;
  email: string | null;
}

interface UseProfile {
  profileImage: string | null;
  profileData: Profile | null;
  loginType: LoginType | null;
  email: string | null;
  cacheProfile: (profile: Profile, loginType: LoginType, email: string) => Promise<void>;
  clearProfile: () => void;
}

const CACHE_KEY = 'cached_profile';

const initialState: ProfileState = {
  image: null,
  data: null,
  loginType: null,
  email: null,
};

export default function useCachedProfile(): UseProfile {
  const [state, setState] = useState<ProfileState>(initialState);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const {
        image, data, loginType, email,
      } = JSON.parse(cached) as CachedProfile;
      setState({
        image,
        data,
        loginType,
        email,
      });
    }
  }, []);

  const cacheProfile = async (
    profile: Profile,
    loginType: LoginType,
    email: string,
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
        email,
        timestamp: Date.now(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setState({
        image: base64Image,
        data: profile,
        loginType,
        email,
      });
    } catch (error) {
      console.error('Failed to cache profile:', error);
    }
  };

  const clearProfile = () => {
    localStorage.removeItem(CACHE_KEY);
    setState(initialState);
  };

  return {
    profileImage: state.image,
    profileData: state.data,
    loginType: state.loginType,
    email: state.email,
    cacheProfile,
    clearProfile,
  };
}
