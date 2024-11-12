/* eslint-disable react/jsx-props-no-spreading */
import { faSquare } from '@fortawesome/free-regular-svg-icons';
import { faCircleCheck, faSquareCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Event, EventCreate } from 'bagad-client';
import {
  Controller, SubmitHandler, useForm
} from 'react-hook-form';
import Input from '../../../components/input';

import costume from '../../../assets/costume.svg';
import polo from '../../../assets/polo.svg';
import tshirt from '../../../assets/tshirt.svg';
import Button from '../../../components/button';
import Select from '../../../components/select';

interface EventFormProps {
  onSubmit: SubmitHandler<EventCreate>,
  data?: Event,
}

export default function EventForm({ onSubmit, data = undefined }: EventFormProps) {
  const {
    register, control, handleSubmit, formState: { errors, dirtyFields }, setValue, watch,
  } = useForm<EventCreate>({ defaultValues: data || { category: 'sortie', isInDoodle: true, costume: 'COSTUME' } });
  console.log(watch());
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="title">Titre</label>
        <Input
          type="text"
          id="title"
          error={errors.title?.message}
          {...register('title', { required: 'Ce champ est obligatoire.', maxLength: { value: 30, message: 'Titre trop long.' } })}
        />
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="description">Description</label>
        <Input
          type="text"
          id="description"
          error={errors.description?.message}
          {...register('description', { required: 'Ce champ est obligatoire.' })}
        />
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="date">Date</label>
        <Controller
          name="date"
          control={control}
          rules={{ required: 'Ce champ est obligatoire.' }}
          defaultValue={new Date()}
          render={({ field }) => (
            <Input
              {...field}
              type="date"
              error={errors.date?.message}
              value={field.value.toISOString().split('T')[0]}
              onChange={(e) => field.onChange(new Date(e.target.value))}
            />
          )}
        />
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="category">Catégorie</label>
        <Select
          id="category"
          error={errors.category?.message}
          {...register('category', {
            required: 'Ce champ est obligatoire.',
            onChange: (e) => {
              if (dirtyFields.isInDoodle !== true) setValue('isInDoodle', e.target.value === 'sortie');
              if (dirtyFields.costume !== true) setValue('costume', e.target.value === 'sortie' ? 'COSTUME' : 'POLO');
            },
          })}
        >
          <option value="sortie">Sortie</option>
          <option value="repetition">Répétition</option>
          <option value="autre">Autre évènement</option>
        </Select>
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="costume-costume">Costume</label>
        <div className="grid md:grid-cols-3 gap-4 md:gap-16">
          <div className="relative">
            <input type="radio" value="COSTUME" id="costume-costume" className="hidden peer" {...register('costume')} />
            <label htmlFor="costume-costume" className="flex items-center gap-8 md:block p-4 md:p-8 text-center cursor-pointer rounded border-2 ring-2 ring-transparent ring-offset-2 peer-checked:border-pourpre-500 hover:bg-gray-50 active:ring-pourpre-200 focus:ring-pourpre-200 focus:ring-offset-0">
              <img className="h-8 md:h-32 inline" src={costume} alt="En Costume" />
              <p>Costume</p>
            </label>
            <FontAwesomeIcon className="absolute invisible top-4 right-4 md:top-8 md:right-8 peer-checked:visible text-pourpre-500" icon={faCircleCheck} />
          </div>
          <div className="relative">
            <input type="radio" value="POLO" id="costume-polo" className="hidden peer" {...register('costume')} />
            <label htmlFor="costume-polo" className="flex items-center gap-8 md:block p-4 md:p-8 text-center cursor-pointer rounded border-2 ring-2 ring-transparent ring-offset-2 peer-checked:border-pourpre-500 hover:bg-gray-50 active:ring-pourpre-200 focus:ring-pourpre-200 focus:ring-offset-0">
              <img className="h-8 md:h-32 inline" src={polo} alt="En polo" />
              <p>Polo</p>
            </label>
            <FontAwesomeIcon className="absolute invisible top-4 right-4 md:top-8 md:right-8 peer-checked:visible text-pourpre-500" icon={faCircleCheck} />
          </div>
          <div className="relative">
            <input type="radio" value="NONE" id="costume-none" defaultChecked className="hidden peer" {...register('costume')} />
            <label htmlFor="costume-none" className="flex items-center gap-8 md:block p-4 md:p-8 text-center cursor-pointer rounded border-2 ring-2 ring-transparent ring-offset-2 peer-checked:border-pourpre-500 hover:bg-gray-50 active:ring-pourpre-200 focus:ring-pourpre-200 focus:ring-offset-0">
              <img className="h-8 md:h-32 inline" src={tshirt} alt="Rien de définie" />
              <p>Rien</p>
            </label>
            <FontAwesomeIcon className="absolute invisible top-4 right-4 md:top-8 md:right-8 peer-checked:visible text-pourpre-500" icon={faCircleCheck} />
          </div>
        </div>
      </div>
      <div className="mb-6">
        <span className="mb-2 block font-semibold">Options</span>
        <div className="relative mb-2">
          <input
            type="checkbox"
            id="is_in_doodle"
            {...register('isInDoodle')}
            className="hidden peer"
          />

          <label htmlFor="is_in_doodle" className="block p-4 pl-16 cursor-pointer rounded border-2 ring-2 ring-transparent ring-offset-2 peer-checked:border-pourpre-500 hover:bg-gray-50 active:ring-pourpre-200 focus:ring-pourpre-200 focus:ring-offset-0">
            <span className="mb-2 block font-semibold">Afficher dans le sondage</span>
            <p className="text-gray-600">
              Cette évènement apparaitra dans le sondage,
              et tous les membres recevront un email lors de la création de l&apos;évènement.
            </p>
          </label>
          <FontAwesomeIcon className="absolute invisible top-4 left-4 md:top-8 md:left-8 peer-checked:visible text-pourpre-500" icon={faSquareCheck} />
          <FontAwesomeIcon className="absolute visible top-4 left-4 md:top-8 md:left-8 peer-checked:invisible text-gray-200" icon={faSquare} />
        </div>
      </div>
      <div className="mb-6">
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}
