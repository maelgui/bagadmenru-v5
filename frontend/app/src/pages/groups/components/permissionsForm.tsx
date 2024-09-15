import { useQuery } from '@tanstack/react-query';
import { Group, GroupUpdate, Permission } from 'bagad-client';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import Button from '../../../components/button';
import Checkbox from '../../../components/checkbox';
import { useApiClient } from '../../../config/client';
import groupBy from '../../../utils/groupby';

interface PermissionsSelectProps {
  permissionsPerTag: Map<string, Permission[]>
  value: string[]
  name: string
  onChange: (value: string[]) => void
  onBlur?: () => void
  disabled?: boolean
}
function PermissionsSelect({
  permissionsPerTag, value, name, onChange, onBlur, disabled,
}: PermissionsSelectProps) {
  return (
    <div>
      {permissionsPerTag && Array.from(permissionsPerTag).map(([tag, permissions]) => (
        <div key={tag} className="mb-4">
          <h3 className="text-lg mb-2">{tag}</h3>
          <div className="grid grid-cols-3 gap-4">
            {permissions.map((p) => (
              <div key={p.id}>
                <Checkbox
                  title={p.id}
                  description={p.description}
                  className="px-2"
                  id={p.id}
                  checked={value.includes(p.id)}
                  onChange={() => onChange(
                    value.includes(p.id)
                      // Already in value: Remove from value
                      ? value.filter((id) => id !== p.id)
                      // Not yet in value: Add to value
                      : [...value, p.id],
                  )}
                  onBlur={onBlur}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}

interface PermissionsFormProps {
  onSubmit: SubmitHandler<GroupUpdate>,
  data: Group,
}
export default function PermissionsForm({ onSubmit, data }: PermissionsFormProps) {
  const { usersApi } = useApiClient();
  const {
    handleSubmit, control,
  } = useForm<GroupUpdate>({
    defaultValues: {
      name: data.name,
      permissionIds: data.permissions.map((p) => p.id),
    },
  });

  const { data: permissionsPerTag } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => usersApi.listPermissionsApiV1PermissionsGet(),
    select: (d) => groupBy(d, (e) => e.tag),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {permissionsPerTag ? (
        <Controller
          control={control}
          name="permissionIds"
          render={({ field }) => (
            <PermissionsSelect
              permissionsPerTag={permissionsPerTag}
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...field}
            />
          )}
        />
      ) : null}
      <Button type="submit">Sauvegarder</Button>
    </form>

  );
}
