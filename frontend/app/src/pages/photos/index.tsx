import { faPersonDigging } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from '../../components/container';
import Header from '../../components/header';

export default function AlbumsPage() {
  return (
    <>
      <Header
        title="Photos"
        breadcrumb={[
          { title: 'Photos' },
        ]}
      />
      <Container>
        <div className="text-center my-8">
          <FontAwesomeIcon icon={faPersonDigging} className="text-8xl p-8" />
          <h3 className="text-2xl p-8">Page en construction</h3>
        </div>
      </Container>
    </>
  );
}
