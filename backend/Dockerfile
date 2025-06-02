FROM node:18

WORKDIR /app

# Copy only the backend package files
COPY backend/package*.json ./
RUN npm install

# Copy backend code
COPY backend/ .

# Copy frontend code into /app/frontend
COPY frontend ./frontend

EXPOSE 3000
CMD ["node", "server.js"]
