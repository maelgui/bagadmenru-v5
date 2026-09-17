import type { UserRankingItem } from 'bagad-client';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { initials, PODIUM_SIZE, type MetricDef } from '../rankings.helpers';

export function RankingsTable({
  rows,
  metric,
  currentUserId,
}: {
  rows: UserRankingItem[];
  metric: MetricDef;
  currentUserId?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Membre</TableHead>
          <TableHead className="text-right">{metric.label}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item, index) => {
          const isMe = currentUserId === item.user.id;
          return (
            <TableRow key={item.user.id} data-state={isMe ? 'selected' : undefined}>
              <TableCell className="font-semibold text-muted-foreground">
                {index + PODIUM_SIZE + 1}
              </TableCell>
              <TableCell>
                <Link
                  to={`/profile/${item.user.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <Avatar size="sm">
                    <AvatarImage
                      src={item.user.pictureUrl ?? undefined}
                      alt={`${item.user.firstName} ${item.user.lastName}`}
                    />
                    <AvatarFallback>
                      {initials(item.user.firstName, item.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {item.user.firstName} {item.user.lastName}
                  </span>
                  {isMe && (
                    <Badge variant="outline" className="ml-1">
                      Vous
                    </Badge>
                  )}
                </Link>
              </TableCell>
              <TableCell className="text-right font-medium">
                {metric.format(metric.value(item.ranks))}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
