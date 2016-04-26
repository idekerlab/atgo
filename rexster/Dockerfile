FROM java:8

RUN apt-get update && apt-get install -y wget

RUN mkdir /atgo-rexster
WORKDIR /atgo-rexster

# Download AtgO database
RUN wget http://chianti.ucsd.edu/~kono/ci/data/atgo/atgo-4-25-2016.zip
# Download rexster v 2.4.0
RUN wget http://chianti.ucsd.edu/~kono/ci/data/atgo/rexster-server-2.4.0.zip

# Setup rexster server
RUN unzip rexster-server-2.4.0.zip

# Add Config file
ADD ./rexster.xml /atgo-rexster/rexster-server-2.4.0/config/
ADD ./scripts/* /atgo-rexster/rexster-server-2.4.0/scripts/

# Extract database (created with Neo4j)
RUN unzip atgo-4-25-2016.zip

# Default rexster port
EXPOSE 8182

WORKDIR /atgo-rexster/rexster-server-2.4.0

CMD ["./bin/rexster.sh", "--start"]
