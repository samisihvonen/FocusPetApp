# Deployment Guide — FocusPet (MVP + V2)

## 📦 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  React Native Frontend (iOS + Android)                  │
│  - AsyncStorage (MVP local)                             │
│  - Zustand global state                                 │
│  - OpenAI API calls (client-side)                       │
│  - Push notifications (V2: Firebase)                    │
└───────────────┬─────────────────────────────────────────┘
                │  HTTP/REST
┌───────────────▼─────────────────────────────────────────┐
│  Spring Boot API (8080)                                 │
│  - User, Task, Pet, Shop endpoints                      │
│  - Database CRUD operations                             │
│  - Authentication (JWT, V2)                             │
│  - Parent approval & notifications                      │
└───────────────┬─────────────────────────────────────────┘
                │  JDBC
┌───────────────▼─────────────────────────────────────────┐
│  PostgreSQL Database (5432)                             │
│  - Users, Tasks, Steps, Pets, ShopItems tables          │
│  - Automated backups (production)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 MVP Deployment (Local + Staging)

### Phase 1: Local Development

```bash
# Terminal 1: Start backend
cd backend
docker-compose up

# Terminal 2: Start React Native
cd FocusPetApp
npm start

# iOS
npm run ios

# Android
npm run android
```

**API Base URL (local):**
```typescript
const API_BASE = 'http://10.0.2.2:8080/api'; // Android
const API_BASE = 'http://localhost:8080/api'; // iOS simulator
```

---

### Phase 2: Staging on AWS / Google Cloud

#### Option A: Google Cloud Run (Recommended for MVP)

```bash
# Build Docker image
cd backend
gcloud builds submit --tag gcr.io/focuspet-project/focuspet-api

# Deploy
gcloud run deploy focuspet-api \
  --image gcr.io/focuspet-project/focuspet-api \
  --platform managed \
  --memory 512M \
  --timeout 3600 \
  --set-env-vars="SPRING_DATASOURCE_URL=jdbc:postgresql://cloudsql-connection" \
  --allow-unauthenticated
```

#### Option B: AWS Elastic Beanstalk

```bash
# Create Beanstalk app
eb create focuspet-env \
  --instance-type t3.micro \
  --envvars="ENVIRONMENT=staging"

# Deploy
eb deploy

# View logs
eb logs
```

#### Option C: Docker Compose on VPS (DigitalOcean, Linode)

```bash
# SSH to VPS
ssh root@your-vps-ip

# Clone repo
git clone <repo> focuspet
cd focuspet/backend

# Update docker-compose.yml for production
nano docker-compose.yml
# Change postgres password, enable backups

# Start services
docker-compose up -d

# Verify
docker ps
```

---

## 🗄️ Database Setup

### Development (H2 in-memory)
- Already configured in `application.properties`
- Console: http://localhost:8080/h2-console

### Staging (PostgreSQL)

**Update `application.properties`:**
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/focuspetdb
spring.datasource.username=focuspet
spring.datasource.password=your-strong-password
spring.jpa.hibernate.ddl-auto=validate  # Don't auto-drop in staging
```

**Create database:**
```sql
CREATE DATABASE focuspetdb;
CREATE USER focuspet WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE focuspetdb TO focuspet;
```

### Production (Multi-zone PostgreSQL on managed service)

**AWS RDS:**
```bash
aws rds create-db-instance \
  --db-instance-identifier focuspet-prod \
  --engine postgres \
  --db-instance-class db.t3.micro \
  --allocated-storage 20 \
  --master-username focuspet \
  --master-user-password <strong-password> \
  --publicly-accessible false
```

**Google Cloud SQL:**
```bash
gcloud sql instances create focuspet-prod \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1
```

---

## 🔒 Security Checklist

- [ ] Change default passwords
- [ ] Enable HTTPS (SSL/TLS certificate)
- [ ] Set up firewall rules (only allow :443, :22)
- [ ] Enable database encryption at rest
- [ ] Add JWT authentication (V2)
- [ ] Implement rate limiting (Spring Security)
- [ ] Enable CORS only for known origins
- [ ] Rotate API keys & secrets regularly
- [ ] Enable database backups (daily)
- [ ] Set up monitoring & alerting (DataDog, New Relic)

---

## 📱 React Native Build & Release

### iOS App Store

```bash
cd ios
pod install
cd ..

# Build for release
xcodebuild -workspace ios/FocusPetApp.xcworkspace \
  -scheme FocusPetApp \
  -configuration Release \
  -derivedDataPath ios/build

# Upload to TestFlight
xcodebuild -exportArchive \
  -archivePath ios/build/FocusPetApp.xcarchive \
  -exportOptionsPlist ios/ExportOptions.plist \
  -exportPath ios/build
```

### Google Play Store

```bash
# Generate signed APK
cd android
./gradlew bundleRelease

# Upload to Google Play Console
# File: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📊 Monitoring & Logging

### Backend Logs (Docker)

```bash
docker logs -f focuspet-api
```

### Application Insights (Azure)

```java
// In pom.xml or build.gradle
implementation 'com.microsoft.azure:applicationinsights-spring-boot-starter:2.6.4'
```

### Sentry (Error Tracking)

```java
// Add Sentry dependency
implementation 'io.sentry:sentry-spring-boot-starter:6.19.0'

// In application.properties
sentry.dsn=https://[key]@sentry.io/[project-id]
```

---

## 🚨 Rollback Strategy

```bash
# If deployment fails
docker-compose down
git reset --hard <previous-commit>
docker-compose up

# Or use blue-green deployment
# Run new version on separate port, switch traffic when ready
```

---

## 📈 Scaling Strategy (Post-MVP)

1. **Cache layer** (Redis) for frequent queries
2. **Read replicas** for database
3. **CDN** for static assets
4. **Load balancer** (nginx, AWS ALB)
5. **Microservices** (Task Breaker AI in separate service)
6. **Message queue** (RabbitMQ, AWS SQS for async tasks)

---

## 📋 Pre-Launch Checklist

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database backups automated
- [ ] Monitoring & alerting in place
- [ ] Load testing (100+ concurrent users)
- [ ] Security audit
- [ ] Privacy policy & GDPR compliance
- [ ] Rate limiting configured
- [ ] SSL certificate valid
- [ ] App Store & Play Store listings ready
- [ ] Parental consent flow implemented

---

## 🆘 Troubleshooting

**Backend won't start:**
```bash
docker-compose logs focuspet-backend | tail -50
```

**Database connection failed:**
```bash
docker exec focuspet-db psql -U focuspet -d focuspetdb -c "SELECT 1;"
```

**API returning 500 errors:**
- Check Spring logs: `/opt/focuspet/logs/`
- Verify database credentials
- Check OpenAI API key (if calling AI service)

**React Native can't reach API:**
- Verify API_BASE URL hardcoding vs environment config
- Check firewall rules on VPS/cloud
- Enable CORS on backend
- Test with `curl`: `curl http://api-url/api/users/1`

---

**Questions? Check:**
- [Spring Boot Docs](https://spring.io/projects/spring-boot)
- [React Native Docs](https://reactnative.dev)
- [Docker Compose Docs](https://docs.docker.com/compose)
