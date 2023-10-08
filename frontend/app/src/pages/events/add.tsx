/* eslint-disable react/jsx-props-no-spreading */
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation } from '@tanstack/react-query';
import { EventCreate } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';
import Input from '../../components/input';

import costume from '../../assets/costume.svg';
import polo from '../../assets/polo.svg';
import tshirt from '../../assets/tshirt.svg';
import Button from '../../components/button';
import Container from '../../components/container';
import { queryClient, useApiClient } from '../../config/client';

export default function AddEventPage() {
  const { eventsApi } = useApiClient();

  const navigate = useNavigate();
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<EventCreate>();
  const { mutate } = useMutation({
    mutationFn: (data: EventCreate) => eventsApi.createEventApiV1EventsPost({ eventCreate: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
  });
  const onSubmit = (data: EventCreate) => mutate(data);

  return (
    <>
      <Header
        title="Ajouter un évènement"
        subtitle="Sortie/répétition/réunion..."
        breadcrumb={[
          { link: '/events', title: 'Calendrier' },
          { title: 'Ajouter un évènement' },
        ]}
      />
      <Container>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6">
            <label className="mb-2 block font-semibold" htmlFor="title">Titre</label>
            <Input
              type="text"
              id="title"
              error={errors.title?.message}
              {...register('title', { required: 'Ce champ est obligatoire.' })}
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
            <Input
              type="date"
              id="date"
              error={errors.date?.message}
              {...register('date', { required: 'Ce champ est obligatoire.', valueAsDate: true })}
            />
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
            <Button type="submit">Envoyer</Button>
          </div>
        </form>
      </Container>
    </>
  );
}
