interface Category {
  name: string,
  bg: string,
}
const EventCategories: { [key: string]: Category } = {
  sortie: {
    name: 'Sortie',
    bg: 'bg-sky-500',
  },
  repetition: {
    name: 'Répétition',
    bg: 'bg-amber-500',
  },
  autre: {
    name: 'Autre évènement',
    bg: 'bg-gray-500',
  },
};

export default EventCategories;
