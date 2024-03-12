import { faCaretDown, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Meta, StoryObj } from '@storybook/react';
import Dropdown, { DropdownContent, DropdownItem, DropdownTrigger } from '../components/dropdown';

function DropdownExemple() {
  return (
    <Dropdown>
      <DropdownTrigger>
        Dropdown
        {' '}
        <FontAwesomeIcon icon={faCaretDown} />
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem>Déplacer</DropdownItem>
        <DropdownItem icon={faTrash}>Supprimer</DropdownItem>
        <DropdownItem icon={faTrash} important>Supprimer</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  component: DropdownExemple,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
} satisfies Meta<typeof DropdownExemple>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  args: {
    children: 'Button',
    outline: false,
  },
};

export const Outine: Story = {
  args: {
    children: 'Button',
    outline: true,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Button',
  },
};

export const WithTrigger: Story = {
  args: {},
};
