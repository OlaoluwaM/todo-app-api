# Using node v18
FROM node:18-slim

# Create & sets up the current working directory for subsequent fielsystem operations
# Name this whatever you want
WORKDIR /server

# Needed because curl does not exist in container by defualt
RUN apt-get update -y
RUN apt-get install curl -y

# Use latest version of npm
RUN npm i npm@latest -g
RUN npm i typescript -g

# https://forums.docker.com/t/what-does-copy-mean/74121/3
COPY . .

# Install dependencies
# RUN commands are ran in like a temp directory then committed to the actual container afer completing
RUN npm ci
RUN npm run build

# Required for inter container communication
# Other containers can access the container using the file from this port
EXPOSE 5003

CMD ["node", "./dist/server.js"]
