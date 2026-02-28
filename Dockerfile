FROM python:3.11-slim

# Install Java only
RUN apt-get update && \
    apt-get install -y default-jdk && \
    apt-get clean

WORKDIR /app

# Copy only backend files
COPY Sqlai.py .
COPY OracleExecutor.java .
COPY ojdbc11.jar .

# Install Python deps
RUN pip install flask flask-cors requests gunicorn

# Compile Java
RUN javac -cp ".:ojdbc11.jar" OracleExecutor.java

# Expose Flask port
EXPOSE 5000

# Start Java executor in background, then start Flask
CMD sh -c "java -cp '.:ojdbc11.jar' OracleExecutor & gunicorn -w 1 -b 0.0.0.0:5000 Sqlai:app"