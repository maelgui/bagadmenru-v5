import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';

const instruments = [
  'Cornemuse',
  'Bombarde',
  'Caisse claire',
  'Grosse caisse',
  'Tom',
  'Batterie',
];

const meta = {
  title: 'Components/Combobox',
  component: Combobox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <div className="w-72">
      <Combobox items={instruments}>
        <ComboboxInput placeholder="Sélectionner un instrument" showClear />
        <ComboboxContent>
          <ComboboxEmpty>Aucun instrument trouvé.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

export const Multiple: Story = {
  render: () => {
    const anchor = useComboboxAnchor();
    return (
      <div className="w-72">
        <Combobox multiple items={instruments}>
          <ComboboxChips ref={anchor}>
            <ComboboxValue>
              {(values: string[]) => (
                <>
                  {values.map((item) => (
                    <ComboboxChip key={item} aria-label={item}>
                      {item}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    placeholder={values.length ? '' : 'Sélectionner des instruments'}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>Aucun instrument trouvé.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    );
  },
};
