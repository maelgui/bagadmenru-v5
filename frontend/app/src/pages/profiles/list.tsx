import { BadgeAlert, BadgeCheck, BellOff, ChevronDown, CircleDashed, CirclePlus, Medal, Plus, RotateCcw, UserPlus, WalletIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MembershipStatus, type Profile } from 'bagad-client';
import Container from '../../components/container';
import Header from '../../components/header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '../../lib/utils';
import { useApiClient, usePermissions } from '../../config/client';

import { GroupTag } from './components/groupTag';

import defaultAvatar from '../../assets/default.svg';

// Membership status, shown only when the API populates `membershipStatus`
// (i.e. the current user holds `view:membership`). A small pill echoing the
// group tags' style, colour-coded per status:
//   active  -> green, labelled with the paid season (e.g. "2026-2027")
//   expired -> amber, "Expirée"
//   none    -> muted, "Sans adhésion"
const MEMBERSHIP_META: Record<
  MembershipStatus,
  { icon: typeof BadgeCheck; className: string; label: string; aria: string }
> = {
  [MembershipStatus.Active]: {
    icon: BadgeCheck,
    className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    label: 'À jour',
    aria: 'Adhésion à jour',
  },
  [MembershipStatus.Expired]: {
    icon: BadgeAlert,
    className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    label: 'Expirée',
    aria: 'Adhésion expirée',
  },
  [MembershipStatus.None]: {
    icon: CircleDashed,
    className: 'bg-muted text-muted-foreground',
    label: 'Sans adhésion',
    aria: 'Aucune adhésion',
  },
};

function MembershipBadge({
  status,
  season,
}: {
  status?: MembershipStatus | null;
  season?: string | null;
}) {
  if (status == null) {
    return null;
  }
  const meta = MEMBERSHIP_META[status];
  const Icon = meta.icon;
  // Only the active pill shows the season label; expired/none use their text.
  const text = status === MembershipStatus.Active && season ? season : meta.label;
  const aria = status === MembershipStatus.Active && season
    ? `${meta.aria}, saison ${season}`
    : meta.aria;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        meta.className,
      )}
      aria-label={aria}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}

// Membership statuses offered in the filter, in display order.
const MEMBERSHIP_FILTER_OPTIONS: Array<{ value: MembershipStatus; label: string }> = [
  { value: MembershipStatus.Active, label: 'À jour' },
  { value: MembershipStatus.Expired, label: 'Expirée' },
  { value: MembershipStatus.None, label: 'Sans adhésion' },
];

// A single selectable criterion in the unified filter combobox. `kind`
// disambiguates the three dimensions that share one list; `value` is the
// membership status literal or the group/instrument id (as a string). base-ui's
// Combobox uses the `{ value, label }` shape for display, so `value` must be a
// stable unique string across all kinds — we prefix it with the kind.
type FilterKind = 'membership' | 'group' | 'instrument';

interface FilterOption {
  kind: FilterKind;
  key: string;
  value: string;
  label: string;
}

function makeOption(kind: FilterKind, rawValue: string, label: string): FilterOption {
  return { kind, key: `${kind}:${rawValue}`, value: `${kind}:${rawValue}`, label };
}

// A labelled section of the combobox dropdown. base-ui reads `items` off each
// group to render its rows, and `label` heads the section.
interface FilterGroup {
  label: string;
  items: FilterOption[];
}

// Build the grouped option list for the dropdown: "Adhésion" (only when
// available), then "Instruments", then "Groupes". `instrument` is also present
// inside `groups` server-side, so we split them on `isInstrument` to keep the
// two dimensions distinct and non-redundant. Empty sections are omitted.
export function deriveFilterOptions(
  profiles: Profile[],
  includeMembership: boolean,
): FilterGroup[] {
  const groups = new Map<number, string>();
  const instruments = new Map<number, string>();
  for (const profile of profiles) {
    for (const group of profile.groups) {
      (group.isInstrument ? instruments : groups).set(group.id, group.name);
    }
    if (profile.instrument) {
      instruments.set(profile.instrument.id, profile.instrument.name);
    }
  }
  const byLabel = (a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label, 'fr');
  const toOptions = (kind: FilterKind, map: Map<number, string>): FilterOption[] =>
    [...map.entries()].map(([id, name]) => makeOption(kind, String(id), name)).sort(byLabel);

  const sections: FilterGroup[] = [];
  if (includeMembership) {
    sections.push({
      label: 'Adhésion',
      items: MEMBERSHIP_FILTER_OPTIONS.map((o) => makeOption('membership', o.value, o.label)),
    });
  }
  sections.push({ label: 'Instruments', items: toOptions('instrument', instruments) });
  sections.push({ label: 'Groupes', items: toOptions('group', groups) });
  return sections.filter((section) => section.items.length > 0);
}

// Flatten grouped options back to a single list (used to seed the Combobox's
// `items` prop and by tests to resolve a criterion by label).
export function flattenOptions(sections: FilterGroup[]): FilterOption[] {
  return sections.flatMap((section) => section.items);
}

function matchesInstrument(profile: Profile, instrumentId: string): boolean {
  return String(profile.instrument?.id) === instrumentId
    || profile.groups.some((g) => g.isInstrument && String(g.id) === instrumentId);
}

function matchesGroup(profile: Profile, groupId: string): boolean {
  return profile.groups.some((g) => !g.isInstrument && String(g.id) === groupId);
}

// The unified filter uses OR within a dimension and AND across dimensions:
// a member matches if, for every dimension that has at least one selected
// criterion, they satisfy at least one of that dimension's criteria.
export function applyFilters(profiles: Profile[], selected: FilterOption[]): Profile[] {
  const byKind: Record<FilterKind, string[]> = { membership: [], group: [], instrument: [] };
  for (const option of selected) {
    // Strip the "kind:" prefix to recover the raw membership status / id.
    byKind[option.kind].push(option.value.slice(option.kind.length + 1));
  }
  return profiles.filter((profile) => {
    if (byKind.membership.length > 0
      && !byKind.membership.includes(profile.membershipStatus ?? MembershipStatus.None)) {
      return false;
    }
    if (byKind.group.length > 0 && !byKind.group.some((id) => matchesGroup(profile, id))) {
      return false;
    }
    if (byKind.instrument.length > 0
      && !byKind.instrument.some((id) => matchesInstrument(profile, id))) {
      return false;
    }
    return true;
  });
}

// A removable filter chip shown next to the "Ajouter un filtre" button.
function FilterChip({
  option,
  onRemove,
}: {
  option: FilterOption;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-3xl bg-input px-3 text-xs font-medium whitespace-nowrap text-foreground dark:bg-input/60">
      {option.label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer le filtre ${option.label}`}
        className="-mr-1 rounded-full p-0.5 opacity-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

// The filter surface: an "Ajouter un filtre" button opens a searchable popup
// whose options are split into labelled sections ("Adhésion", "Instruments",
// "Groupes"); chosen criteria show as removable chips next to the button.
// Selecting several chips is OR within a dimension and AND across dimensions
// (see `applyFilters`).
function FilterBar({
  selected,
  setSelected,
  sections,
}: {
  selected: FilterOption[];
  setSelected: (selected: FilterOption[]) => void;
  sections: FilterGroup[];
}) {
  const removeAt = (key: string) => setSelected(selected.filter((o) => o.key !== key));

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <Combobox<FilterOption, true>
        multiple
        items={sections}
        value={selected}
        onValueChange={setSelected}
        itemToStringLabel={(item) => item.label}
        isItemEqualToValue={(a, b) => a.key === b.key}
      >
        <ComboboxTrigger
          render={<Button variant="outline" />}
          className="border-dashed"
        >
          <Plus data-icon="inline-start" />
          Ajouter un filtre
        </ComboboxTrigger>
        <ComboboxContent align="start">
          <ComboboxInput showTrigger={false} placeholder="Rechercher…" />
          <ComboboxEmpty>Aucun résultat.</ComboboxEmpty>
          <ComboboxList>
            {(section: FilterGroup) => (
              <ComboboxGroup key={section.label} items={section.items}>
                <ComboboxLabel>{section.label}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: FilterOption) => (
                    <ComboboxItem key={item.key} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {selected.map((option) => (
        <FilterChip key={option.key} option={option} onRemove={() => removeAt(option.key)} />
      ))}

      {selected.length > 0 && (
        <Button variant="ghost" onClick={() => setSelected([])}>
          <RotateCcw data-icon="inline-start" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link
      to={`/profile/${profile.id}`}
      className="block h-full rounded-4xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex h-full flex-col overflow-hidden surface rounded-4xl pb-8 transition-shadow hover:shadow-md">
        <div className="p-8">
          <div className="relative aspect-square overflow-hidden rounded-full">
            <img src={profile.pictureUrl ?? defaultAvatar} alt="profile" className="absolute size-full bg-primary/10 object-cover" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 px-2 pt-4 text-center">
          <h4 className="text-lg font-semibold">
            {`${profile.firstName} ${profile.lastName}`}
            {!profile.receivesEmails && (
              <BellOff className="ml-1 inline size-3 text-destructive" aria-label="Ne reçoit pas les emails" />
            )}
          </h4>
          <MembershipBadge
            status={profile.membershipStatus}
            season={profile.membershipActiveSeason}
          />
          {profile.groups.length > 0 && (
            <div className="-m-1 flex flex-wrap justify-center">
              {profile.groups.map((group) => (
                <GroupTag key={group.id} name={group.name} color={group.color} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// The members list exposes one primary action — "Inviter" — with "Ajouter un
// membre" (create) tucked into a split-button dropdown so the header stays
// uncluttered. Each entry is gated on its own permission: the dropdown is
// omitted when the caller can't add a profile, and the invite button is hidden
// without `create:invitation`.
function MemberActions() {
  const { can } = usePermissions();

  const canInvite = can('create', 'invitation');
  const canAddProfile = can('create', 'profile');

  const menuItems = [
    canAddProfile && (
      <DropdownMenuItem key="add-profile" render={<Link to="/profile/add" />}>
        <CirclePlus data-icon="inline-start" />
        Ajouter un membre
      </DropdownMenuItem>
    ),
  ].filter(Boolean);

  // Without the invite permission the primary slot falls away; the secondary
  // menu (if any) then stands on its own as a plain "Actions" button.
  if (!canInvite) {
    if (menuItems.length === 0) {
      return null;
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Actions
          <ChevronDown data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="inline-flex items-center">
      <Link
        className={cn(
          buttonVariants(),
          menuItems.length > 0 && 'rounded-r-none border-r border-r-primary-foreground/20',
        )}
        to="/profile/invite"
      >
        <UserPlus data-icon="inline-start" />
        Inviter
      </Link>
      {menuItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon" className="rounded-l-none" aria-label="Plus d’actions" />}
          >
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default function ProfilesPage() {
  const { usersApi } = useApiClient();
  const { can } = usePermissions();

  const { data } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => await usersApi.listProfilesApiV1ProfilesGet(),
  });

  const [selected, setSelected] = useState<FilterOption[]>([]);

  // Whether the API populated membership status (caller holds `view:membership`).
  // When it didn't, omitting the membership criteria avoids offering options
  // that can only ever match "none".
  const canViewMembership = useMemo(
    () => (data ?? []).some((p) => p.membershipStatus != null),
    [data],
  );

  const sections = useMemo(
    () => deriveFilterOptions(data ?? [], canViewMembership),
    [data, canViewMembership],
  );

  const filtered = useMemo<Profile[] | undefined>(
    () => (data ? applyFilters(data, selected) : undefined),
    [data, selected],
  );

  return (
    <>
      <Header
        title="Liste des membres"
        subtitle="Pensez à ajouter votre photo"
        actions={[
          <Link
            key="rankings"
            className={cn(buttonVariants({ variant: 'outline' }), !can('view', 'response') && 'hidden')}
            to="/profile/rankings"
          >
            <Medal data-icon="inline-start" />
            Classements
          </Link>,
          <Link
            key="memberships"
            className={cn(buttonVariants({ variant: 'outline' }), !can('view', 'membership') && 'hidden')}
            to="/profile/membership/reconciliation"
          >
            <WalletIcon data-icon="inline-start" />
            Adhésions
          </Link>,
          <MemberActions key="member-actions" />,
        ]}
        breadcrumb={[
          { title: 'Liste des membres' },
        ]}
      />

      <Container>
        <FilterBar
          selected={selected}
          setSelected={setSelected}
          sections={sections}
        />

        {filtered?.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Aucun membre</EmptyTitle>
              <EmptyDescription>
                Aucun membre ne correspond aux filtres sélectionnés.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
            {filtered
              ? filtered.map((profile) => <ProfileCard key={profile.id} profile={profile} />)
              : Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64" />)}
          </div>
        )}
      </Container>

    </>

  );
}
