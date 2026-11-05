#
# Copyright (C) 2026 Red Hat, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0
#

FROM registry.access.redhat.com/ubi10/nodejs-24-minimal:1791463197@sha256:498ccfc43f6fe349a4d87db6af6d83ab420e9450f3800140cdc90c290dcd462f AS builder

WORKDIR /opt/app-root/src

ENV CI=true

RUN npm install --global corepack@0.35.0 && corepack enable

COPY --chown=1001:1001 . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

RUN mkdir -p /opt/app-root/extension && \
    cp -r packages/backend/dist packages/backend/media packages/backend/package.json packages/backend/icon.png \
      LICENSE README.md /opt/app-root/extension/

FROM scratch

LABEL org.opencontainers.image.title="Red Hat Catalog extension" \
        org.opencontainers.image.description="Browse, inspect and pull container images from the Red Hat Ecosystem Catalog." \
        org.opencontainers.image.vendor="redhat" \
        io.podman-desktop.api.version=">= 1.30.0"

COPY --from=builder /opt/app-root/extension /extension
