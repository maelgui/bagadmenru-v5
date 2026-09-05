interface Category {
  name: string;
  variant: 'default';
  className?: string;
}

const EventCategories: Partial<Record<string, Category>> = {
  sortie: {
    name: 'Sortie',
    variant: 'default',
  },
  repetition: {
    name: 'Répétition',
    variant: 'default',
    className: 'bg-amber-500 text-white',
  },
  autre: {
    name: 'Autre évènement',
    variant: 'default',
    className: 'bg-slate-500 text-white',
  },
};

export default EventCategories;
