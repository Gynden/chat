FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV RUPTURA_STANDALONE=1
COPY package.json package-lock.json ./
# Optional public CA bundle for cloud builders behind a trusted TLS proxy.
RUN --mount=type=secret,id=cloud-ca \
    if [ -r /run/secrets/cloud-ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/cloud-ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN mkdir -p public && npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV GAME_DATA_DIR=/data
RUN mkdir -p /data && chown node:node /app /data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
