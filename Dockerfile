FROM python:3.11-slim

# Install Java and Node.js
RUN apt-get update && \
    apt-get install -y default-jdk curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

WORKDIR /app

# Copy everything
COPY . .

# Install Python deps
RUN pip install flask flask-cors requests gunicorn

# Build React frontend
RUN npm install && npm run build

# Compile Java
RUN javac -cp ".:ojdbc11.jar" OracleExecutor.java

# Expose Flask port
EXPOSE 5000

# Start Java executor in background, then start Flask
CMD sh -c "java -cp '.:ojdbc11.jar' OracleExecutor & gunicorn -w 1 -b 0.0.0.0:5000 Sqlai:app"