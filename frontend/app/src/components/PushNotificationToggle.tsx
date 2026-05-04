import { faBell, faBellSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import toast from 'react-hot-toast';
import env from '../env';
import { usePushNotifications } from '../utils/usePushNotifications';

export default function PushNotificationToggle() {
  const {
    status, isSubscribed, isLoading, isSupported, subscribe, unsubscribe,
  } = usePushNotifications();

  const apiUrl = env.VITE_BBE2_API_URL || '';

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-400 mt-2">
        <FontAwesomeIcon icon={faBellSlash} className="mr-2" />
        Les notifications push ne sont pas supportées par votre navigateur.
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="text-sm text-red-400 mt-2">
        <FontAwesomeIcon icon={faBellSlash} className="mr-2" />
        Les notifications sont bloquées. Veuillez les autoriser
        dans les paramètres de votre navigateur.
      </div>
    );
  }

  const handleToggle = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const handleTest = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/push/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Notification de test envoyée !');
      } else {
        toast.error('Erreur lors de l\'envoi de la notification.');
      }
    } catch {
      toast.error('Erreur réseau.');
    }
  };

  return (
    <div className="mb-6">
      <label
        htmlFor="pushNotifications"
        className="flex items-center gap-3 cursor-pointer"
      >
        <input
          type="checkbox"
          id="pushNotifications"
          className="h-5 w-5 rounded border-gray-300 text-pourpre-500 focus:ring-pourpre-500"
          checked={isSubscribed}
          onChange={handleToggle}
          disabled={isLoading}
        />
        <span className="font-semibold">
          <FontAwesomeIcon
            icon={isSubscribed ? faBell : faBellSlash}
            className="mr-2"
          />
          Notifications push
        </span>
        {isLoading && (
          <span className="text-sm text-gray-400">Chargement...</span>
        )}
      </label>
      <p className="text-sm text-gray-500 mt-1 ml-8">
        {isSubscribed
          ? 'Vous recevrez des notifications pour les nouveaux événements.'
          : 'Activez pour recevoir des notifications push sur cet appareil.'}
      </p>
      {isSubscribed && (
        <button
          type="button"
          onClick={handleTest}
          className="ml-8 mt-2 text-sm text-pourpre-500 hover:text-pourpre-700 underline"
        >
          Envoyer une notification de test
        </button>
      )}
    </div>
  );
}
