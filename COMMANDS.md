# Quick Commands — FocusPet Backend

## 🐳 Docker

### Start everything
```bash
cd backend
docker-compose up
```

### Stop
```bash
docker-compose down
```

### View logs
```bash
docker logs -f focuspet-api
docker logs -f focuspet-db
```

### Rebuild image
```bash
docker-compose up --build
```

### Clean slate (⚠️ removes data)
```bash
docker-compose down -v
docker-compose up
```

---

## 🔨 Build & Run (Local Gradle)

### Build without tests
```bash
./gradlew build -x test
```

### Run directly
```bash
./gradlew bootRun
```

### Run with PostgreSQL profile
```bash
./gradlew bootRun --args='--spring.profiles.active=postgres'
```

---

## 🗄️ Database

### Connect to PostgreSQL (inside Docker)
```bash
docker exec -it focuspet-db psql -U focuspet -d focuspetdb

# List tables
\dt

# Query users
SELECT * FROM users;

# Exit
\q
```

### H2 Console (dev)
- Open: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:mem:focuspetdb`
- Username: `sa`
- Password: (blank)

---

## 🧪 Testing

### Run tests
```bash
./gradlew test
```

### Test specific class
```bash
./gradlew test --tests UserControllerTest
```

### Generate test coverage
```bash
./gradlew jacocoTestReport
```

---

## 📝 API Calls (curl)

### Create user
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"Aleksi","email":"aleksi@example.com"}'
```

### Get user
```bash
curl http://localhost:8080/api/users/1
```

### Get user stats
```bash
curl http://localhost:8080/api/users/1/stats
```

### Create task
```bash
curl -X POST "http://localhost:8080/api/tasks?userId=1" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Siivoa huone",
    "status":"IDLE",
    "steps":[
      {"stepOrder":1,"emoji":"🗑️","description":"Kerää roskat"}
    ]
  }'
```

### Get pet
```bash
curl http://localhost:8080/api/pets/user/1
```

### Update pet happiness
```bash
curl -X PUT "http://localhost:8080/api/pets/1/happiness?delta=20"
```

---

## 📦 Dependency Management

### Add Gradle dependency
```groovy
implementation 'group:artifact:version'
```

### Update all dependencies
```bash
./gradlew dependencyUpdates
```

---

## 🐛 Troubleshooting

### Port already in use (8080)
```bash
lsof -i :8080
kill -9 <PID>
```

### Database won't start
```bash
docker-compose logs focuspet-db
docker volume rm focuspet_postgres_data
docker-compose up --rebuild
```

### API returns 500
```bash
docker logs focuspet-api | grep ERROR
```

### Import issues after new entities
```bash
./gradlew clean build -x test
```

---

## 🚀 Deploy to Cloud

### Google Cloud Run
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/focuspet-api
gcloud run deploy focuspet-api --image gcr.io/PROJECT_ID/focuspet-api
```

### AWS Elastic Beanstalk
```bash
eb create focuspet-env
eb deploy
```

### Docker Hub push
```bash
docker tag focuspet-backend:latest yourusername/focuspet:latest
docker push yourusername/focuspet:latest
```

---

## 🎯 Common Workflows

### Full local setup from scratch
```bash
cd backend
docker-compose down -v
docker-compose up
# Wait for "Application started"
# In new terminal:
curl http://localhost:8080/api/users/1  # Should return 404
```

### Add new entity & test it
```bash
# 1. Create entity class (src/main/java/com/focuspet/entity/MyEntity.java)
# 2. Create repository (src/main/java/com/focuspet/repository/MyEntityRepository.java)
# 3. Create controller (src/main/java/com/focuspet/controller/MyEntityController.java)
# 4. Rebuild:
./gradlew clean build -x test
./gradlew bootRun
```

### Update frontend to use new API
```bash
# 1. Update src/services/api.ts with new endpoint
# 2. Import in React component
# 3. Call function and handle response
```

---

**Pro Tip:** Add these to your terminal alias:
```bash
alias be='cd backend'
alias docker-logs='docker logs -f focuspet-api | tail -50'
alias restart-api='docker-compose restart focuspet-api'
```
