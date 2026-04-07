# FocusPet Spring Boot Backend

Lightweight REST API backend for FocusPet — ADHD task management app for kids.

## 🗂️ Project Structure

```
backend/
├── src/main/java/com/focuspet/
│   ├── entity/           # JPA entities (User, Task, Step, Pet, ShopItem)
│   ├── repository/       # Spring Data JPA repositories
│   ├── controller/       # REST API endpoints
│   ├── dto/             # Data Transfer Objects
│   └── FocusPetApplication.java
├── src/main/resources/
│   └── application.properties
├── build.gradle         # Gradle build config
├── settings.gradle
├── docker-compose.yml   # PostgreSQL + backend
└── Dockerfile          # Container build
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
cd backend
docker-compose up
```

Then access:
- **API**: http://localhost:8080
- **H2 Console** (dev): http://localhost:8080/h2-console

### Option 2: Local Development

```bash
# Install Java 21 (or use SDKMAN: sdk install java 21.0.1-graalvm)
cd backend

# Run with Gradle
./gradlew bootRun

# Or build and run JAR
./gradlew build
java -jar build/libs/focuspet-backend-0.0.1-SNAPSHOT.jar
```

## 📡 API Endpoints

### Users
```
GET  /api/users/{id}             # Get user
POST /api/users                  # Create user
PUT  /api/users/{id}             # Update user
GET  /api/users/{id}/stats       # Get stats
```

### Tasks
```
GET  /api/tasks/user/{userId}    # Get user's tasks
GET  /api/tasks/{id}             # Get single task
POST /api/tasks?userId=1         # Create task
PUT  /api/tasks/{id}/complete    # Mark complete
DELETE /api/tasks/{id}           # Delete task
```

### Pet
```
GET /api/pets/user/{userId}            # Get pet
PUT /api/pets/{petId}/happiness?delta=20  # Update happiness
```

## 🗄️ Database Schema

### H2 (Development)
- In-memory database at startup
- Console: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:mem:focuspetdb`

### PostgreSQL (Production)
Switch in `application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/focuspetdb
spring.datasource.driverClassName=org.postgresql.Driver
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
```

## 🔌 Integration with React Native Frontend

Update frontend API base in `src/services/taskBreaker.ts`:

```typescript
const API_BASE = 'http://10.0.2.2:8080/api'; // Android emulator
// or
const API_BASE = 'http://localhost:8080/api'; // iOS simulator
```

Example API call:
```typescript
const response = await axios.get(`${API_BASE}/users/1`);
```

## 📦 Dependencies

- **Spring Boot 3.2.0**
- **PostgreSQL 16** (or H2 for dev)
- **Lombok** (annotations)
- **Jackson** (JSON)
- **JPA/Hibernate** (ORM)

## 🛠️ Development

### Check Database Schema
```bash
# H2 Console
# Navigate to: http://localhost:8080/h2-console
# Login with: sa / (blank password)
```

### Rebuild without tests
```bash
./gradlew build -x test
```

### View logs
```bash
docker logs focuspet-api
```

## 📝 Environment Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `SPRING_DATASOURCE_URL` | H2 in-memory | Set for PostgreSQL |
| `SPRING_DATASOURCE_USERNAME` | sa | |
| `SPRING_DATASOURCE_PASSWORD` | (blank) | |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | create-drop | `update` for production |

## 🚧 Next Steps (V2)

- [ ] Authentication (JWT)
- [ ] Parental approval endpoints
- [ ] Push notifications (Firebase)
- [ ] File uploads (pet avatars)
- [ ] Rate limiting & caching (Redis)
- [ ] API versioning
- [ ] Swagger/OpenAPI documentation
