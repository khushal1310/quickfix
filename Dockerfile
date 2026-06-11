FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies first for caching
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies for lean footprint
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
