/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import type * as Monaco from 'monaco-editor';

/**
 * Lazily loads a minimal Monaco: the editor core and the languages we display (Dockerfile), themed with the
 * Podman Desktop terminal colors (same approach as the Quadlet extension).
 */
export class MonacoManager {
  protected static monaco: Promise<typeof Monaco> | undefined;

  static getMonaco(): Promise<typeof Monaco> {
    MonacoManager.monaco ??= MonacoManager.load();
    return MonacoManager.monaco;
  }

  static readonly THEME = 'podmanDesktopTheme';

  protected static async load(): Promise<typeof Monaco> {
    const monaco = (await import('monaco-editor/editor/editor.api.js')) as unknown as typeof Monaco;
    await import('monaco-editor/languages/definitions/dockerfile/register.js');
    MonacoManager.registerTheme(monaco);
    return monaco;
  }

  protected static registerTheme(monaco: typeof Monaco): void {
    const background = MonacoManager.getTerminalBackground();
    monaco.editor.defineTheme(MonacoManager.THEME, {
      base: MonacoManager.isDark(background) ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': background,
        // make the --vscode-focusBorder transparent
        focusBorder: '#00000000',
      },
    });
  }

  protected static getTerminalBackground(): string {
    let color = getComputedStyle(document.documentElement).getPropertyValue('--pd-terminal-background').trim();
    // monaco only accepts 6-digit colors
    if (/^#[0-9a-f]{3}$/i.test(color)) {
      color = `#${color
        .slice(1)
        .split('')
        .map(c => c + c)
        .join('')}`;
    }
    return color || '#000000';
  }

  protected static isDark(color: string): boolean {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return true;
    const [r, g, b] = [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
  }
}
