<script lang="ts">
import type * as Monaco from 'monaco-editor';

import { MonacoManager } from '$lib/monaco/monaco';

interface Props {
  content: string;
  language: string;
  label: string;
}

let { content, language, label }: Props = $props();

let editor: Monaco.editor.IStandaloneCodeEditor | undefined;

/**
 * Read-only Monaco editor; the content updates in place (e.g. when switching architecture).
 */
function mountEditor(container: HTMLElement): () => void {
  let disposed = false;
  MonacoManager.getMonaco()
    .then(monaco => {
      if (disposed) return;
      editor = monaco.editor.create(container, {
        value: content,
        language,
        readOnly: true,
        domReadOnly: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        theme: MonacoManager.THEME,
        fontSize: 12,
        renderLineHighlight: 'none',
      });
    })
    .catch(console.error);
  return (): void => {
    disposed = true;
    editor?.dispose();
    editor = undefined;
  };
}

$effect(() => {
  if (editor && editor.getValue() !== content) editor.setValue(content);
});
</script>

<div class="h-full w-full min-h-0 overflow-hidden" role="region" aria-label={label} {@attach mountEditor}></div>
