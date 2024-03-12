// Copy pasted from: https://github.com/InseeFrLab/keycloakify/blob/main/src/login/Template.tsx

import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePrepareTemplate } from 'keycloakify/lib/usePrepareTemplate';
import { type TemplateProps } from 'keycloakify/login/TemplateProps';
import { useGetClassName } from 'keycloakify/login/lib/useGetClassName';
import { assert } from 'keycloakify/tools/assert';
import { clsx } from 'keycloakify/tools/clsx';
import { useEffect, useState } from 'react';
import Dropdown, { DropdownContent, DropdownItem, DropdownTrigger } from '../../components/dropdown';
import SimpleLayout from '../../layout/simple';
import type { I18n } from './i18n';
import type { KcContext } from './kcContext';

export default function Template(props: TemplateProps<KcContext, I18n>) {
  const {
    displayInfo = false,
    displayMessage = true,
    displayRequiredFields = false,
    displayWide = false,
    showAnotherWayIfPresent = true,
    headerNode,
    showUsernameNode = null,
    infoNode = null,
    kcContext,
    i18n,
    doUseDefaultCss,
    classes,
    children,
  } = props;

  const { getClassName } = useGetClassName({ doUseDefaultCss, classes });

  const {
    msg, changeLocale, labelBySupportedLanguageTag, currentLanguageTag,
  } = i18n;

  const {
    realm, locale, auth, url, message, isAppInitiatedAction,
  } = kcContext;

  const { isReady } = usePrepareTemplate({
    doFetchDefaultThemeResources: doUseDefaultCss,
    styles: [
      // `${url.resourcesCommonPath}/node_modules/patternfly/dist/css/patternfly.min.css`,
      // `${url.resourcesCommonPath}/node_modules/patternfly/dist/css/patternfly-additions.min.css`,
      // `${url.resourcesCommonPath}/lib/zocial/zocial.css`,
      // `${url.resourcesPath}/css/login.css`,
    ],
    htmlClassName: getClassName('kcHtmlClass'),
    bodyClassName: getClassName('kcBodyClass'),
  });

  useState(() => { document.title = i18n.msgStr('loginTitle', kcContext.realm.displayName); });

  useEffect(() => {
    console.log(`Value of MY_ENV_VARIABLE on the Keycloak server: "${kcContext.properties.MY_ENV_VARIABLE}"`);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SimpleLayout noQueryClient>
      <div className={getClassName('kcLoginClass')}>
        <div id="kc-header" className={getClassName('kcHeaderClass')}>
          <div
            id="kc-header-wrapper"
            className={getClassName('kcHeaderWrapperClass')}
            style={{ fontFamily: '"Work Sans"' }}
          >
            {/* {msg('loginTitleHtml', realm.displayNameHtml)} */}
          </div>
        </div>

        <div className={clsx(getClassName('kcFormCardClass'), displayWide && getClassName('kcFormCardAccountClass'))}>
          <header className={getClassName('kcFormHeaderClass')}>
            {realm.internationalizationEnabled
              && (assert(locale !== undefined), true)
              && locale.supported.length > 1
              && (
                <div className={clsx(getClassName('kcLocaleWrapperClass'), 'flex')}>
                  <Dropdown>
                    <DropdownTrigger className="ml-auto">
                      <FontAwesomeIcon icon={faLanguage} className="ml-2" title={currentLanguageTag} />
                    </DropdownTrigger>
                    <DropdownContent>
                      {locale.supported.map(({ languageTag }) => (
                        <DropdownItem
                          key={languageTag}
                          onClick={() => changeLocale(languageTag)}
                        >
                          {labelBySupportedLanguageTag[languageTag]}
                        </DropdownItem>
                      ))}
                    </DropdownContent>
                  </Dropdown>
                </div>
              )}
            {!(auth !== undefined && auth.showUsername && !auth.showResetCredentials) ? (
              displayRequiredFields ? (
                <div className={getClassName('kcContentWrapperClass')}>
                  <div className={clsx(getClassName('kcLabelWrapperClass'), 'subtitle')}>
                    <span className="subtitle">
                      <span className="required">*</span>
                      {msg('requiredFields')}
                    </span>
                  </div>
                  <div className="col-md-10">
                    <h1 id="kc-page-title" className="text-2xl mb-6">{headerNode}</h1>
                  </div>
                </div>
              ) : (
                <h1 id="kc-page-title" className="text-2xl mb-6">{headerNode}</h1>
              )
            ) : displayRequiredFields ? (
              <div className={getClassName('kcContentWrapperClass')}>
                <div className={clsx(getClassName('kcLabelWrapperClass'), 'subtitle')}>
                  <span className="subtitle">
                    <span className="required">*</span>
                    {' '}
                    {msg('requiredFields')}
                  </span>
                </div>
                <div className="col-md-10">
                  {showUsernameNode}
                  <div className={getClassName('kcFormGroupClass')}>
                    <div id="kc-username">
                      <label id="kc-attempted-username">{auth?.attemptedUsername}</label>
                      <a id="reset-login" href={url.loginRestartFlowUrl}>
                        <div className="kc-login-tooltip">
                          <i className={getClassName('kcResetFlowIcon')} />
                          <span className="kc-tooltip-text">{msg('restartLoginTooltip')}</span>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {showUsernameNode}
                <div className={getClassName('kcFormGroupClass')}>
                  <div id="kc-username">
                    <label id="kc-attempted-username">{auth?.attemptedUsername}</label>
                    <a id="reset-login" href={url.loginRestartFlowUrl}>
                      <div className="kc-login-tooltip">
                        <i className={getClassName('kcResetFlowIcon')} />
                        <span className="kc-tooltip-text">{msg('restartLoginTooltip')}</span>
                      </div>
                    </a>
                  </div>
                </div>
              </>
            )}
          </header>
          <div id="kc-content">
            <div id="kc-content-wrapper">
              {/* App-initiated actions should not see warning messages about the need to complete the action during login. */}
              {displayMessage && message !== undefined && (message.type !== 'warning' || !isAppInitiatedAction) && (
                <div className={clsx('alert', `alert-${message.type}`)}>
                  {message.type === 'success' && <span className={getClassName('kcFeedbackSuccessIcon')} />}
                  {message.type === 'warning' && <span className={getClassName('kcFeedbackWarningIcon')} />}
                  {message.type === 'error' && <span className={getClassName('kcFeedbackErrorIcon')} />}
                  {message.type === 'info' && <span className={getClassName('kcFeedbackInfoIcon')} />}
                  <span
                    className="kc-feedback-text"
                    dangerouslySetInnerHTML={{
                      __html: message.summary,
                    }}
                  />
                </div>
              )}
              {children}
              {auth !== undefined && auth.showTryAnotherWayLink && showAnotherWayIfPresent && (
                <form
                  id="kc-select-try-another-way-form"
                  action={url.loginAction}
                  method="post"
                  className={clsx(displayWide && getClassName('kcContentWrapperClass'))}
                >
                  <div
                    className={clsx(
                      displayWide && [getClassName('kcFormSocialAccountContentClass'), getClassName('kcFormSocialAccountClass')],
                    )}
                  >
                    <div className={getClassName('kcFormGroupClass')}>
                      <input type="hidden" name="tryAnotherWay" value="on" />
                      <a
                        href="#"
                        id="try-another-way"
                        onClick={() => {
                          document.forms['kc-select-try-another-way-form' as never].submit();
                          return false;
                        }}
                      >
                        {msg('doTryAnotherWay')}
                      </a>
                    </div>
                  </div>
                </form>
              )}
              {displayInfo && (
                <div id="kc-info" className={getClassName('kcSignUpClass')}>
                  <div id="kc-info-wrapper" className={getClassName('kcInfoAreaWrapperClass')}>
                    {infoNode}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
}
