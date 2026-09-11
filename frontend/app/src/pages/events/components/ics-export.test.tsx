// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import IcsExportMenu from './ics-export';

function renderMenu() {
  return render(
    <MemoryRouter>
      <IcsExportMenu />
    </MemoryRouter>,
  );
}

describe('IcsExportMenu', () => {
  // Regression test for production error #31 (Base UI: MenuGroupContext is
  // missing): DropdownMenuLabel wraps Menu.GroupLabel which must live inside
  // a Menu.Group. Opening the menu crashed until the label was moved into
  // the group.
  it('opens without crashing and shows the label and actions', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Synchroniser/ }));
    expect(screen.getByText('Ajouter à mon calendrier')).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Google Agenda/ })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /Copier l'URL ICS/ })).toBeDefined();
  });
});
