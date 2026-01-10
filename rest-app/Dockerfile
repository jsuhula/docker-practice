# --- Etapa 1: Compilación ---
FROM maven:3.8.6-jdk-8-slim AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

# --- Etapa 2: Ejecución ---
FROM amazoncorretto:8-alpine

RUN apk add --no-cache curl
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]