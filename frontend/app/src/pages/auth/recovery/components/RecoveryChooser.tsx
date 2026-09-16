import { ChevronRight, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import PasskeyIcon from '../../../../components/PasskeyIcon';

/**
 * Post-recovery choice for accounts that have a password: secure the next
 * sign-in with a passkey (recommended, hidden where unsupported) or a new
 * password. Purely presentational — the /auth/next page owns the funnel
 * state and renders the chosen screen.
 */
export default function RecoveryChooser({
  offerPasskey,
  onChoosePasskey,
  onChoosePassword,
  onLater,
}: {
  offerPasskey: boolean;
  onChoosePasskey: () => void;
  onChoosePassword: () => void;
  onLater: () => void;
}) {
  return (
    <div>
      <h1 className="mb-2 text-2xl">Vous êtes connecté·e</h1>
      <p className="mb-8 text-muted-foreground">
        Comment voulez-vous vous reconnecter la prochaine fois&nbsp;?
      </p>

      <ItemGroup>
        {offerPasskey ? (
          <Item
            variant="outline"
            className="hover:bg-muted"
            render={<button type="button" onClick={onChoosePasskey} />}
          >
            <ItemMedia variant="icon">
              <PasskeyIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                Créer une clé d&apos;accès
                <Badge variant="secondary">Recommandé</Badge>
              </ItemTitle>
              <ItemDescription>
                Empreinte, visage ou code de l&apos;appareil. Plus de mot de
                passe à retenir.
              </ItemDescription>
            </ItemContent>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Item>
        ) : null}
        <Item
          variant="outline"
          className="hover:bg-muted"
          render={<button type="button" onClick={onChoosePassword} />}
        >
          <ItemMedia variant="icon">
            <LockKeyhole />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Définir un nouveau mot de passe</ItemTitle>
            <ItemDescription>
              Choisissez un nouveau mot de passe pour vos prochaines
              connexions.
            </ItemDescription>
          </ItemContent>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Item>
      </ItemGroup>

      <Button
        type="button"
        variant="ghost"
        className="mt-4 w-full text-muted-foreground"
        onClick={onLater}
      >
        Plus tard
      </Button>
    </div>
  );
}
