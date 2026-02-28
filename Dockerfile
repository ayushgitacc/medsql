FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y default-jdk && \
    apt-get clean

WORKDIR /app

COPY Sqlai.py .
COPY OracleExecutor.java .
COPY ojdbc11.jar .
COPY oraclepki.jar .
COPY osdt_core.jar .
COPY osdt_cert.jar .
COPY Wallet_MedAi/ ./wallet/

RUN sed -i 's|?/network/admin|/app/wallet|g' /app/wallet/sqlnet.ora

RUN pip install flask flask-cors requests gunicorn

RUN javac -cp ".:ojdbc11.jar:oraclepki.jar:osdt_core.jar:osdt_cert.jar" OracleExecutor.java

EXPOSE 5000

CMD sh -c "java -cp '.:ojdbc11.jar:oraclepki.jar:osdt_core.jar:osdt_cert.jar' OracleExecutor & gunicorn -w 1 -b 0.0.0.0:5000 Sqlai:app"