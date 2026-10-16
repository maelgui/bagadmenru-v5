import { useMemo } from 'react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type AttendanceState = 'present' | 'absent' | 'unknown';

export interface StageMember {
  id: string;
  name: string;
  color: string;
  sectionName: string;
  state: AttendanceState;
}

type Zone = 'left' | 'center' | 'right' | 'other';

interface Point { x: number; y: number }
interface PlacedMember { member: StageMember; point: Point }

const HALF = 0.5;
const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 232;
const STAGE_CENTER_X = VIEWBOX_WIDTH * HALF;
const STAGE_CENTER_Y = 212;

const ZONE_COUNT = 3;
const ARC_RADIUS = 150;
const OTHER_RADIUS_GAP = 34;
const OTHER_RADIUS = ARC_RADIUS + OTHER_RADIUS_GAP;

const DOT_RADIUS = 9;
const CONDUCTOR_RADIUS = 6;
const STRAIGHT_ANGLE = 180;
const DEGREES_TO_RADIANS = Math.PI / STRAIGHT_ANGLE;

const ZONE_ORDER: Zone[] = ['left', 'center', 'right', 'other'];

const ARC_SPAN = STRAIGHT_ANGLE;
const ARC_START_DEG = STRAIGHT_ANGLE;
const ZONE_GAP_DEG = 9;

const ZONE_SWEEP: Record<Zone, [number, number]> = (() => {
  const left: [number, number] = [ARC_START_DEG + ZONE_GAP_DEG, ARC_START_DEG + ARC_SPAN / ZONE_COUNT - ZONE_GAP_DEG];
  const center: [number, number] = [left[1] + ZONE_GAP_DEG, left[1] + ARC_SPAN / ZONE_COUNT];
  const right: [number, number] = [center[1] + ZONE_GAP_DEG, ARC_START_DEG + ARC_SPAN - ZONE_GAP_DEG];
  const other: [number, number] = [ARC_START_DEG + ZONE_GAP_DEG, ARC_START_DEG + ARC_SPAN - ZONE_GAP_DEG];
  return {
    left, center, right, other,
  };
})();

const ZONE_RADIUS: Record<Zone, number> = {
  left: ARC_RADIUS,
  center: ARC_RADIUS,
  right: ARC_RADIUS,
  other: OTHER_RADIUS,
};

export function zoneForName(name: string): Zone {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/bombard|talabard/.test(normalized)) return 'left';
  if (/batter|caisse|percu|tambour|tabour|snare|tom|basse/.test(normalized)) return 'center';
  if (/cornemuse|biniou|pib|pipe|bag/.test(normalized)) return 'right';
  return 'other';
}

function polarToPoint(angleDeg: number, radius: number) {
  const angle = angleDeg * DEGREES_TO_RADIANS;
  return {
    x: STAGE_CENTER_X + radius * Math.cos(angle),
    y: STAGE_CENTER_Y + radius * Math.sin(angle),
  };
}

function layoutZone(members: StageMember[], zone: Zone): PlacedMember[] {
  const [start, end] = ZONE_SWEEP[zone];
  const radius = ZONE_RADIUS[zone];
  return members.map((member, slot) => {
    const fraction = members.length > 1 ? slot / (members.length - 1) : HALF;
    const angle = start + (end - start) * fraction;
    return { member, point: polarToPoint(angle, radius) };
  });
}

function MemberDot({ member, point }: { member: StageMember; point: Point }) {
  const stateLabel = member.state === 'present' ? 'présent' : member.state === 'absent' ? 'absent' : 'sans réponse';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={(
            <circle
              cx={point.x}
              cy={point.y}
              r={DOT_RADIUS}
              fill={member.state === 'present' ? member.color : 'transparent'}
              stroke={member.color}
              strokeWidth={2}
              strokeDasharray={member.state === 'unknown' ? '3 3' : undefined}
              className={cn('cursor-default outline-none', member.state === 'absent' && 'opacity-70')}
              tabIndex={0}
              aria-label={`${member.name} - ${stateLabel}`}
            />
          )}
        />
        <TooltipContent>{member.name} - {stateLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function StageMap({ members }: { members: StageMember[] }) {
  const placed = useMemo(() => {
    const byZone = new Map<Zone, StageMember[]>();
    members.forEach((member) => {
      const zone = zoneForName(member.sectionName);
      byZone.set(zone, [...(byZone.get(zone) ?? []), member]);
    });
    return ZONE_ORDER.flatMap((zone) => layoutZone(byZone.get(zone) ?? [], zone));
  }, [members]);

  if (members.length === 0) return null;

  const arcFrom = polarToPoint(ZONE_SWEEP.left[0], ARC_RADIUS);
  const arcTo = polarToPoint(ZONE_SWEEP.right[1], ARC_RADIUS);
  const arcPath = `M ${arcFrom.x} ${arcFrom.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${arcTo.x} ${arcTo.y}`;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Placement des membres sur scène selon leur réponse"
    >
      <path d={arcPath} fill="none" className="stroke-border" strokeWidth={1} />
      <circle cx={STAGE_CENTER_X} cy={STAGE_CENTER_Y} r={CONDUCTOR_RADIUS} className="fill-muted-foreground" />
      {placed.map(({ member, point }) => <MemberDot key={member.id} member={member} point={point} />)}
    </svg>
  );
}
