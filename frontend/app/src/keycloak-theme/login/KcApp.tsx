/* eslint-disable max-len */
import Fallback, { PageProps } from 'keycloakify/login';
import { lazy, Suspense } from 'react';
import '../../index.css';
import { useI18n } from './i18n';
import './KcApp.css';
import type { KcContext } from './kcContext';
import Template from './Template';

const Info = lazy(() => import('keycloakify/login/pages/Info'));

// This is like adding classes to theme.properties
// https://github.com/keycloak/keycloak/blob/11.0.3/themes/src/main/resources/theme/keycloak/login/theme.properties
const classes = {
  // NOTE: The classes are defined in ./KcApp.css
  kcHtmlClass: 'my-root-class',
  kcHeaderWrapperClass: 'my-color my-font',
  kcFormGroupClass: 'mb-6',
  kcLabelClass: 'mb-2 block font-semibold',
  kcInputClass: 'block w-full border-gray-200 rounded py-2 px-4 border-2 focus:outline-none focus:bg-white focus:border-pourpre-400 hover:bg-gray-50 invalid:border-red-600 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed',
  kcButtonClass: 'py-2 px-4 bg-pourpre-500 text-white hover:border-pourpre-200 hover:bg-white hover:text-pourpre-600 rounded inline-block border border-pourpre-500 uppercase transition m-1 font-bold text-sm undefined whitespace-nowrap disabled:cursor-not-allowed cursor-pointer',
  kcButtonBlockClass: 'w-full my-6',
} satisfies PageProps['classes'];

export default function KcApp(props: { kcContext: KcContext; }) {
  const { kcContext } = props;

  const i18n = useI18n({ kcContext });

  if (i18n === null) {
    // NOTE: Text resources for the current language are still being downloaded,
    // we can't display anything yet.
    // We could display a loading progress but it's usually a matter of milliseconds.
    return null;
  }

  /*
        * Examples assuming i18n.currentLanguageTag === "en":
        * i18n.msg("access-denied") === <span>Access denied</span>
        * i18n.msg("foo") === <span>foo in English</span>
        */

  return (
    <Suspense>
      {(() => {
        switch (kcContext.pageId) {
          // We choose to use the default Template for the Info page and to download the theme resources.
          // This is just an example to show you what is possible. You likely don't want to keep this as is.
          case 'info.ftl': return (
            <Info
              {...{ kcContext, i18n, classes }}
              Template={lazy(() => import('keycloakify/login/Template'))}
              doUseDefaultCss
            />
          );
          default: return <Fallback {...{ kcContext, i18n, classes }} Template={Template} doUseDefaultCss={false} />;
        }
      })()}
    </Suspense>
  );
}
