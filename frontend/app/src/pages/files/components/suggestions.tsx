import { CircleHelp, Lightbulb } from 'lucide-react';
import type { Suggestion } from 'bagad-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FileItem, { FileItemSkeleton } from './file-item';

function SuggestionsHelp() {
  return (
    <Popover>
      <PopoverTrigger
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        aria-label="D'où viennent ces suggestions ?"
      >
        <CircleHelp className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="max-w-xs gap-2 text-left">
        <p className="font-medium">D’où viennent ces suggestions ?</p>
        <p className="text-background/80">
          On met en avant les fichiers populaires dans tes groupes, ceux qui sont consultés en ce moment, et les ajouts récents.
          Ouvrir ou télécharger un fichier affine ces suggestions.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export default function Suggestions({ suggestions, isPending }: { suggestions?: Suggestion[]; isPending: boolean }) {
  if (isPending) {
    return (
      <div className="mb-10 flex flex-col gap-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><FileItemSkeleton /><FileItemSkeleton /></div>
      </div>
    );
  }
  if (!suggestions?.length) return null;
  return (
    <section className="mb-10 flex flex-col gap-3" aria-labelledby="suggestions-heading">
      <h2 id="suggestions-heading" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Lightbulb className="size-4 text-primary" aria-hidden="true" />
        Suggestions
        <SuggestionsHelp />
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {suggestions.map((suggestion) => (
          <FileItem key={suggestion.file.id} file={suggestion.file} />
        ))}
      </div>
    </section>
  );
}
