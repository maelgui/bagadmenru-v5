import type { LucideIcon } from 'lucide-react';
import { FolderIcon, HouseIcon, UsersIcon } from 'lucide-react';

export type Permission = [action: string, resource: string];
export type Can = (action: string, resource: string) => boolean;

export interface AppPage {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
  // Extra words the search palette matches besides the label.
  keywords?: string[];
}

export function isAllowed(page: { permission?: Permission }, can: Can): boolean {
  return !page.permission || can(...page.permission);
}

export const HOME_PAGE: AppPage = { label: 'Accueil', to: '/', icon: HouseIcon, keywords: ['home', 'degemer mat'] };
export const FILES_PAGE: AppPage = {
  label: 'Fichiers', to: '/files', icon: FolderIcon, permission: ['view', 'file'], keywords: ['partitions', 'documents', 'dossiers'],
};
export const MEMBERS_PAGE: AppPage = {
  label: 'Trombinoscope', to: '/profile', icon: UsersIcon, permission: ['view', 'profile'], keywords: ['membres', 'liste', 'annuaire'],
};
