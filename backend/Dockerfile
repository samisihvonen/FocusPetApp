FROM eclipse-temurin:21-jdk-alpine as builder
WORKDIR /workspace

COPY . /workspace
RUN apk add --no-cache gradle && gradle build -x test

FROM eclipse-temurin:21-jdk-alpine
WORKDIR /opt/focuspet

COPY --from=builder /workspace/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
