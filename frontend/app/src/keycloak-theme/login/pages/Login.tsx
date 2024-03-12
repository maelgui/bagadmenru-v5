/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-nested-ternary */
import { useGetClassName } from 'keycloakify/login/lib/useGetClassName';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import { clsx } from 'keycloakify/tools/clsx';
import { useConstCallback } from 'keycloakify/tools/useConstCallback';
import { useState, type FormEventHandler } from 'react';
import Button from '../../../components/button';
import Input from '../../../components/input';
import type { I18n } from '../i18n';
import type { KcContext } from '../kcContext';

export default function Login(props: PageProps<Extract<KcContext, { pageId: 'login.ftl' }>, I18n>) {
  const {
    kcContext, i18n, doUseDefaultCss, Template, classes,
  } = props;

  const { getClassName } = useGetClassName({
    doUseDefaultCss,
    classes,
  });

  const {
    social, realm, url, usernameHidden, login, auth, registrationDisabled,
  } = kcContext;

  const { msg, msgStr } = i18n;

  const [isLoginButtonDisabled, setIsLoginButtonDisabled] = useState(false);

  const onSubmit = useConstCallback<FormEventHandler<HTMLFormElement>>((e) => {
    e.preventDefault();

    setIsLoginButtonDisabled(true);

    const formElement = e.target as HTMLFormElement;

    // NOTE: Even if we login with email Keycloak expect username and password in
    // the POST request.
    formElement.querySelector("input[name='email']")?.setAttribute('name', 'username');

    formElement.submit();
  });

  return (
    <Template
      {...{
        kcContext, i18n, doUseDefaultCss, classes,
      }}
      displayInfo={
        realm.password
        && realm.registrationAllowed
        && !registrationDisabled
      }
      displayWide={realm.password && social.providers !== undefined}
      headerNode={msg('doLogIn')}
      infoNode={(
        <div id="kc-registration">
          <span>
            {msg('noAccount')}
            <a href={url.registrationUrl}>
              {msg('doRegister')}
            </a>
          </span>
        </div>
      )}
    >
      <div id="kc-form" className={clsx(realm.password && social.providers !== undefined && getClassName('kcContentWrapperClass'))}>
        <div
          id="kc-form-wrapper"
          className={clsx(
            realm.password
            && social.providers && [getClassName('kcFormSocialAccountContentClass'), getClassName('kcFormSocialAccountClass')],
          )}
        >
          {realm.password && (
            <form id="kc-form-login" onSubmit={onSubmit} action={url.loginAction} method="post">
              <div className={getClassName('kcFormGroupClass')}>
                {!usernameHidden
                  && (() => {
                    const label = !realm.loginWithEmailAllowed
                      ? 'username'
                      : realm.registrationEmailAsUsername
                        ? 'email'
                        : 'usernameOrEmail';

                    const autoCompleteHelper: typeof label = label === 'usernameOrEmail' ? 'username' : label;

                    return (
                      <div className="mb-6">
                        <label className="mb-2 block font-semibold" htmlFor={autoCompleteHelper}>
                          {msg(label)}
                        </label>

                        <Input
                          id={autoCompleteHelper}
                          className={getClassName('kcInputClass')}
                          // NOTE: This is used by Google Chrome auto fill so we use it to tell
                          // the browser how to pre fill the form but before submit we put it back
                          // to username because it is what keycloak expects.
                          name={autoCompleteHelper}
                          defaultValue={login.username ?? ''}
                          type="text"
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          autoComplete="off"
                        />
                      </div>
                    );
                  })()}
              </div>
              <div className="mb-6">
                <label className="mb-2 block font-semibold" htmlFor="password">
                  {msg('password')}
                </label>

                <Input
                  id="password"
                  className={getClassName('kcInputClass')}
                  name="password"
                  type="password"
                  autoComplete="off"
                />
              </div>
              <div className={clsx(getClassName('kcFormGroupClass'), getClassName('kcFormSettingClass'))}>
                <div id="kc-form-options">
                  {realm.rememberMe && !usernameHidden && (
                    <div className="checkbox">
                      <label>
                        <input
                          id="rememberMe"
                          name="rememberMe"
                          type="checkbox"
                          {...(login.rememberMe === 'on'
                            ? {
                              checked: true,
                            }
                            : {})}
                        />
                        {msg('rememberMe')}
                      </label>
                    </div>
                  )}
                </div>
                <div className={getClassName('kcFormOptionsWrapperClass')}>
                  {realm.resetPasswordAllowed && (
                    <span>
                      <a href={url.loginResetCredentialsUrl}>
                        {msg('doForgotPassword')}
                      </a>
                    </span>
                  )}
                </div>
              </div>
              <div id="kc-form-buttons" className={getClassName('kcFormGroupClass')}>
                <input
                  type="hidden"
                  id="id-hidden-input"
                  name="credentialId"
                  {...(auth?.selectedCredential !== undefined
                    ? {
                      value: auth.selectedCredential,
                    }
                    : {})}
                />
                <Button
                  className={clsx(
                    getClassName('kcButtonClass'),
                    getClassName('kcButtonPrimaryClass'),
                    getClassName('kcButtonBlockClass'),
                    getClassName('kcButtonLargeClass'),
                    'my-6',
                    'w-full',
                  )}
                  name="login"
                  id="kc-login"
                  type="submit"
                  disabled={isLoginButtonDisabled}
                >
                  {msgStr('doLogIn')}
                </Button>
              </div>
            </form>
          )}
        </div>
        {realm.password && social.providers !== undefined && (
          <>
            <div className="separator my-6">OU</div>
            <div
              id="kc-social-providers"
              className={clsx(getClassName('kcFormSocialAccountContentClass'), getClassName('kcFormSocialAccountClass'))}
            >
              <div className="flex flex-wrap justify-stretch">
                {social.providers.map((p) => (
                  <Button key={p.providerId} variant="outline" as="a" href={p.loginUrl} className={clsx('zocial', p.providerId, 'grow', 'text-center')}>
                    {p.displayName}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Template>
  );
}
