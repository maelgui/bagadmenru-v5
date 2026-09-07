import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SHARE_TITLE = 'Rejoindre le Bagad Men Ru';
const SHARE_TEXT = "Tu es invité·e à rejoindre le Bagad Men Ru. Complète ton inscription ici :";

/** Whether the Web Share API is available (most mobile browsers, some desktop). */
export function canWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Share the invitation link via the native share sheet (mobile). */
export default function ShareLinkButton({ url }: { url: string }) {
  const onShare = () => {
    navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url }).catch(() => {
      // User cancelled the share sheet, or sharing failed; nothing to do.
    });
  };
  return (
    <Button type="button" onClick={onShare}>
      <Share2 data-icon="inline-start" aria-hidden="true" />
      Partager
    </Button>
  );
}
