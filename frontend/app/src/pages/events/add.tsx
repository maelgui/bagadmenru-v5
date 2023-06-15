/* eslint-disable react/jsx-props-no-spreading */
import { useForm } from 'react-hook-form';
import Header from '../../components/header';
import Input from '../../components/input';

import costume from '../../assets/costume.svg';
import polo from '../../assets/polo.svg';
import tshirt from '../../assets/tshirt.svg';
import Button from '../../components/button';

export default function AddEventPage() {
  const {
    register, handleSubmit, formState: { errors },
  } = useForm();
  const onSubmit = (data) => console.log(data);

  console.log(errors);

  return (
    <>
      <Header
        title="Ajouter un évènement"
        subtitle="Sortie/répétition/réunion..."
      />
      {errors && <span>This field is required</span>}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="title">Titre</label>
          <Input type="text" id="title" {...register('title')} />
        </div>
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="description">Description</label>
          <Input type="text" id="description" {...register('description')} />
        </div>
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="date">Date</label>
          <Input type="date" id="date" {...register('date')} />
        </div>
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="costume-costume">Costume</label>
          <div className="grid grid-cols-3 gap-16">
            <div>
              <input type="radio" name="costume" value="COSTUME" id="costume-costume" className="hidden peer" />
              <label htmlFor="costume-costume" className="block p-8 text-center cursor-pointer rounded border-2 peer-checked:border-pourpre-500 hover:bg-gray-50">
                <img className="h-32 inline" src={costume} alt="En Costume" />
                <p>Costume</p>
              </label>
            </div>
            <div>
              <input type="radio" name="costume" value="POLO" id="costume-polo" className="hidden peer" />
              <label htmlFor="costume-polo" className="block p-8 text-center cursor-pointer rounded border-2 peer-checked:border-pourpre-500 hover:bg-gray-50">
                <img className="h-32 inline" src={polo} alt="En polo" />
                <p>Polo</p>
              </label>
            </div>
            <div>
              <input type="radio" name="costume" value="NONE" id="costume-none" className="hidden peer" />
              <label htmlFor="costume-none" className="block p-8 text-center cursor-pointer rounded border-2 peer-checked:border-pourpre-500 hover:bg-gray-50">
                <img className="h-32 inline" src={tshirt} alt="Rien de définie" />
                <p>Rien</p>
              </label>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <Button type="submit">Envoyer</Button>
        </div>
      </form>
    </>
  );
}
