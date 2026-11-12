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

/**
 * Publisher logos come in every shape and color: wide wordmarks, dark artwork and white artwork on transparent
 * backgrounds. Classify them to pick how a card shows them.
 */
export type LogoKind = 'wide' | 'light' | 'dark';

/**
 * Wordmarks wider than this are a few pixels tall in a square tile.
 */
export const MAX_LOGO_RATIO = 2;
/**
 * Mean luminance (0-1) of the visible pixels above which the artwork is considered light.
 */
export const LIGHT_LUMINANCE = 0.75;

/**
 * @param pixels RGBA pixels of the logo drawn on a small canvas, undefined when they cannot be read
 */
export function classifyLogo(width: number, height: number, pixels?: Uint8ClampedArray): LogoKind {
  if (height && width / height > MAX_LOGO_RATIO) return 'wide';
  if (!pixels) return 'dark';

  let weight = 0;
  let luminance = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    if (alpha < 0.1) continue;
    // relative luminance (sRGB coefficients), weighted by opacity
    luminance += alpha * ((0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255);
    weight += alpha;
  }
  if (weight === 0) return 'dark';
  return luminance / weight > LIGHT_LUMINANCE ? 'light' : 'dark';
}

/**
 * Logo hosts answering with `Access-Control-Allow-Origin: *`. Partner logos are served by connect.redhat.com;
 * static.redhat.com (the Red Hat logo, most repositories) does not send CORS headers: requesting it in CORS mode
 * would fail to load the image.
 */
const CORS_LOGO_HOSTS = new Set(['connect.redhat.com']);

export function isCorsLogoHost(url: string): boolean {
  try {
    return CORS_LOGO_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const SAMPLE_SIZE = 16;

/**
 * Read a loaded image on a small canvas. The logos are served with `Access-Control-Allow-Origin: *`, the image
 * must be loaded with `crossorigin="anonymous"`; otherwise the canvas is tainted and the pixels are not readable.
 */
export function readLogo(image: HTMLImageElement): LogoKind {
  let pixels: Uint8ClampedArray | undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    }
  } catch {
    // tainted canvas or no canvas support: fall back to the default tile
  }
  return classifyLogo(image.naturalWidth, image.naturalHeight, pixels);
}
