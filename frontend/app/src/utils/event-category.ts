interface Category {
  name: string;
  variant: 'sortie' | 'repetition' | 'default';
}

const EventCategories: { [key: string]: Category } = {
  sortie: {
    name: 'Sortie',
    variant: 'sortie',
  },
  repetition: {
    name: 'Répétition',
    variant: 'repetition',
  },
  autre: {
    name: 'Autre évènement',
    variant: 'default',
  },
};

export default EventCategories;
