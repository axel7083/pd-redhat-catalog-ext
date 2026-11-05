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
import type { AuthenticationSession, Disposable, TelemetryLogger } from '@podman-desktop/api';
import {
  authentication as authenticationAPI,
  extensions as extensionsAPI,
  navigation as navigationAPI,
  registry as registryAPI,
} from '@podman-desktop/api';
import type { AuthStatus } from '@podman-desktop/extension-redhat-catalog-core-api';
import { Messages } from '@podman-desktop/extension-redhat-catalog-core-api';
import { inject, injectable, postConstruct, preDestroy } from 'inversify';

import { REGISTRY_REDHAT_IO } from '/@/catalog/registry-resolver';
import { TelemetryLoggerSymbol } from '/@/inject/symbol';
import { WebviewService } from '/@/services/webview-service';
import type { AsyncInit } from '/@/utils/async-init';
import { Publisher } from '/@/utils/publisher';
import { TelemetryEvents } from '/@/utils/telemetry-events';

export const REDHAT_AUTHENTICATION_EXTENSION_ID = 'redhat.redhat-authentication';
export const REDHAT_AUTHENTICATION_PROVIDER_ID = 'redhat.authentication-provider';
/**
 * Same scopes as the Red Hat authentication extension uses, so the session it creates is reused.
 */
export const REDHAT_AUTHENTICATION_SCOPES = ['api.iam.registry_service_accounts', 'api.console'];

/**
 * After sign-in, the Red Hat authentication extension creates a registry service account and registers
 * registry.redhat.io asynchronously. This is how long we wait for it before pulling anyway.
 */
const REGISTRY_REGISTRATION_TIMEOUT_MS = 60_000;

/**
 * Red Hat sign-in, delegated to the Red Hat authentication extension (soft dependency: the catalog
 * works anonymously without it, only registry.redhat.io pulls need it).
 */
@injectable()
export class AuthService extends Publisher<AuthStatus> implements AsyncInit, Disposable {
  #disposables: Disposable[] = [];
  #session: AuthenticationSession | undefined;

  constructor(
    @inject(WebviewService)
    webviewService: WebviewService,
    @inject(TelemetryLoggerSymbol)
    protected readonly telemetryLogger: TelemetryLogger,
  ) {
    super(webviewService, Messages.UPDATE_AUTH, () => this.#toStatus());
  }

  isProviderAvailable(): boolean {
    return !!extensionsAPI.getExtension(REDHAT_AUTHENTICATION_EXTENSION_ID);
  }

  #toStatus(): AuthStatus {
    return {
      providerAvailable: this.isProviderAvailable(),
      signedIn: !!this.#session,
      account: this.#session?.account.label,
    };
  }

  async getStatus(): Promise<AuthStatus> {
    await this.#refreshSession();
    return this.#toStatus();
  }

  async #refreshSession(): Promise<void> {
    if (!this.isProviderAvailable()) {
      this.#session = undefined;
      return;
    }
    try {
      this.#session = await authenticationAPI.getSession(
        REDHAT_AUTHENTICATION_PROVIDER_ID,
        REDHAT_AUTHENTICATION_SCOPES,
        { createIfNone: false },
      );
    } catch (err: unknown) {
      console.warn('unable to read the Red Hat authentication session', err);
      this.#session = undefined;
    }
  }

  /**
   * Sign in, then wait for registry.redhat.io to be registered (or a timeout).
   */
  async signIn(): Promise<AuthStatus> {
    const telemetry: Record<string, unknown> = {};
    try {
      if (!this.isProviderAvailable()) {
        throw new Error('The Red Hat Authentication extension is required to sign in to registry.redhat.io.');
      }
      const registered = this.waitForRegistry(REGISTRY_REDHAT_IO, REGISTRY_REGISTRATION_TIMEOUT_MS);
      const alreadySignedIn = !!(await authenticationAPI.getSession(
        REDHAT_AUTHENTICATION_PROVIDER_ID,
        REDHAT_AUTHENTICATION_SCOPES,
        { createIfNone: false },
      ));
      this.#session = await authenticationAPI.getSession(
        REDHAT_AUTHENTICATION_PROVIDER_ID,
        REDHAT_AUTHENTICATION_SCOPES,
        { createIfNone: true },
      );
      telemetry['signedIn'] = !!this.#session;
      // the registry is only configured on a new session
      if (this.#session && !alreadySignedIn) {
        telemetry['registryRegistered'] = await registered.promise;
      }
      registered.dispose();
      this.notify();
      return this.#toStatus();
    } catch (err: unknown) {
      telemetry['error'] = String(err);
      throw err;
    } finally {
      this.telemetryLogger.logUsage(TelemetryEvents.SIGN_IN, telemetry);
    }
  }

  /**
   * Resolve to true when a registry with the given server URL is registered, false after the timeout.
   */
  waitForRegistry(serverUrl: string, timeoutMs: number): { promise: Promise<boolean>; dispose: () => void } {
    let listener: Disposable | undefined;
    let timeout: NodeJS.Timeout | undefined;
    const dispose = (): void => {
      listener?.dispose();
      clearTimeout(timeout);
    };
    const promise = new Promise<boolean>(resolve => {
      listener = registryAPI.onDidRegisterRegistry(registry => {
        if (registry.serverUrl.replace(/^https?:\/\//, '').startsWith(serverUrl)) {
          dispose();
          resolve(true);
        }
      });
      timeout = setTimeout(() => {
        dispose();
        resolve(false);
      }, timeoutMs);
    });
    return { promise, dispose };
  }

  async installAuthenticationExtension(): Promise<void> {
    await navigationAPI.navigateToExtensionsCatalog({ searchTerm: 'Red Hat Authentication' });
  }

  @postConstruct()
  async init(): Promise<void> {
    this.#disposables.push(
      authenticationAPI.onDidChangeSessions(event => {
        if (event.provider.id !== REDHAT_AUTHENTICATION_PROVIDER_ID) return;
        this.#refreshSession()
          .then(() => this.notify())
          .catch(console.error);
      }),
    );
    this.#disposables.push(extensionsAPI.onDidChange(() => this.notify()));
  }

  @preDestroy()
  override dispose(): void {
    super.dispose();
    this.#disposables.forEach(disposable => disposable.dispose());
    this.#disposables = [];
  }
}
