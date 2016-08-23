FROM node:5.6

MAINTAINER Keiichiro Ono <kono@ucsd.edu>

# Step 1: Basic node.js server setup
RUN apt-get update && apt-get install -y build-essential

RUN apt-get install -y ruby-full rubygems-integration
RUN gem install compass

# Install compass for grunt

RUN npm install -g forever bower grunt-cli

RUN mkdir /app
ADD . /app

# Step 2: Build frontend code
WORKDIR /app/frontend

RUN npm install
RUN bower --allow-root install

RUN grunt --force

# Copy the frontend code to server
RUN cp -r ./dist ../public/

# Step 3: Install dependencies for node.js server
WORKDIR /app
RUN npm install

# Step 4: Add download data
ADD ./download/AIM_H_SAPIENS.tar.gz /app/public/data/
ADD ./download/AIM_S_CEREVISIAE.tar.gz /app/public/data/

EXPOSE 3000

CMD ["node", "app.js"]
