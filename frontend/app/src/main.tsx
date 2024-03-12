import { StrictMode, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { kcContext as kcLoginThemeContext } from './keycloak-theme/login/kcContext';

const KcLoginThemeApp = lazy(() => import('./keycloak-theme/login/KcApp'));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Suspense>
      {(() => {
        if (kcLoginThemeContext !== undefined) {
          return <KcLoginThemeApp kcContext={kcLoginThemeContext} />;
        }

        return <App />;
      })()}
    </Suspense>
  </StrictMode>,
);
