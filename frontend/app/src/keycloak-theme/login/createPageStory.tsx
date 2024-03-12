import type { DeepPartial } from 'keycloakify/tools/DeepPartial';
import KcApp from './KcApp';
import { getKcContext, type KcContext } from './kcContext';

// eslint-disable-next-line import/prefer-default-export
export function createPageStory<PageId extends KcContext['pageId']>(params: {
  pageId: PageId;
}) {
  const { pageId } = params;

  function PageStory({
    kcContext: partialKcContext = undefined,
  }: { kcContext?: DeepPartial<Extract<KcContext, { pageId: PageId }>>; }) {
    const { kcContext } = getKcContext({
      mockPageId: pageId,
      storyPartialKcContext: partialKcContext,
    });

    return (
      <KcApp kcContext={kcContext} />
    );
  }

  return { PageStory };
}
