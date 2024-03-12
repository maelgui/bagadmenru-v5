import { useGetClassName } from 'keycloakify/login/lib/useGetClassName';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import { clsx } from 'keycloakify/tools/clsx';
import Button from '../../../components/button';
import Input from '../../../components/input';
import type { I18n } from '../i18n';
import type { KcContext } from '../kcContext';

export default function LoginResetPassword(props: PageProps<Extract<KcContext, { pageId: 'login-reset-password.ftl' }>, I18n>) {
  const {
    kcContext, i18n, doUseDefaultCss, Template, classes,
  } = props;

  const { getClassName } = useGetClassName({
    doUseDefaultCss,
    classes,
  });

  const { url, realm, auth } = kcContext;

  const { msg, msgStr } = i18n;

  return (
    <Template
      {...{
        kcContext, i18n, doUseDefaultCss, classes,
      }}
      displayMessage={false}
      headerNode={msg('emailForgotTitle')}
      infoNode={msg('emailInstruction')}
    >
      <form id="kc-reset-password-form" className={getClassName('kcFormClass')} action={url.loginAction} method="post">
        <div className="mb-6">
          <label className="mb-2 block font-semibold" htmlFor="username">
            {// eslint-disable-next-line no-nested-ternary
              !realm.loginWithEmailAllowed
                ? msg('username')
                : !realm.registrationEmailAsUsername
                  ? msg('usernameOrEmail')
                  : msg('email')
            }
          </label>

          <Input
            type="text"
            id="username"
            name="username"
            className={getClassName('kcInputClass')}
            // eslint-disable-next-line max-len
            defaultValue={auth !== undefined && auth.showUsername ? auth.attemptedUsername : undefined}
          />
        </div>
        <div className={clsx(getClassName('kcFormGroupClass'), getClassName('kcFormSettingClass'))}>
          <div id="kc-form-options" className={getClassName('kcFormOptionsClass')}>
            <div className={getClassName('kcFormOptionsWrapperClass')}>
              <span>
                <a href={url.loginUrl}>{msg('backToLogin')}</a>
              </span>
            </div>
          </div>

          <div id="kc-form-buttons" className={getClassName('kcFormButtonsClass')}>
            <Button
              className={clsx(
                'my-6',
                'w-full',
              )}
              type="submit"
            >
              {msgStr('doSubmit')}
            </Button>
          </div>
        </div>
      </form>
    </Template>
  );
}
