FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y default-jdk && \
    apt-get clean

WORKDIR /app

COPY Sqlai.py .
COPY OracleExecutor.java .
COPY ojdbc11.jar .
COPY Wallet_MedAi_OracleServer/ ./wallet/

RUN pip install flask flask-cors requests gunicorn

RUN javac -cp ".:ojdbc11.jar" OracleExecutor.java

EXPOSE 5000

CMD sh -c "java -cp '.:ojdbc11.jar' OracleExecutor & gunicorn -w 1 -b 0.0.0.0:5000 Sqlai:app"