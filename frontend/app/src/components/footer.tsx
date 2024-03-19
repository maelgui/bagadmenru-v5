import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function Footer() {
  return (
    <div className="border-t border-gray-200 text-center py-8 px-4 mt-24 ">
      <span className="text-gray-300 hover:text-gray-900 transition-colors group">
        Made with
        {' '}
        <FontAwesomeIcon icon={faHeart} className="text-gray-300 group-hover:text-hotpink transition-colors" />
        {' '}
        by Mael G.
      </span>
    </div>
  );
}
