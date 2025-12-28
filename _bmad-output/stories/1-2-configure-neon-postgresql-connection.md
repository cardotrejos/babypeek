# Story 1.2: Configure Neon PostgreSQL Connection

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-20  
**Completed:** 2024-12-20

---

## User Story

As a **developer**,  
I want **Neon PostgreSQL connected via Drizzle ORM**,  
So that **I can store and query data in the database**.

---

## Acceptance Criteria

| #   | Criterion                                     | Status                    |
| --- | --------------------------------------------- | ------------------------- |
| 1   | Drizzle connects to PostgreSQL without errors | ✅ Done                   |
| 2   | `bun run db:push` syncs schema changes        | ✅ Done                   |
| 3   | `bun run db:studio` opens Drizzle Studio      | ✅ Done                   |
| 4   | Connection pooling configured for serverless  | ⏳ Deferred to Neon setup |

---

## Implementation Summary

### Local Development (Docker)

**Docker PostgreSQL:**

```yaml
# packages/db/docker-compose.yml
services:
  postgres:
    image: postgres
    container_name: babypeek-postgres
    environment:
      POSTGRES_DB: babypeek
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
```

**Environment Configuration:**

```bash
# apps/server/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/babypeek"
```

### Commands Used

```bash
# Start PostgreSQL
bun run db:start

# Push schema
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Tables Created

| Table       | Purpose                                            |
| ----------- | -------------------------------------------------- |
| `uploads`   | Tracks ultrasound uploads and AI processing status |
| `purchases` | Tracks Stripe payments                             |
| `downloads` | Tracks HD image downloads                          |

### Verification

```bash
docker exec babypeek-postgres psql -U postgres -d babypeek -c "\dt"

# Output:
#  Schema |   Name    | Type  |  Owner
# --------+-----------+-------+----------
#  public | downloads | table | postgres
#  public | purchases | table | postgres
#  public | uploads   | table | postgres
```

---

## Production Setup (Neon) - Deferred

When deploying to production:

1. Create Neon database at https://neon.tech
2. Update `DATABASE_URL` with Neon connection string
3. Use `@neondatabase/serverless` for connection pooling
4. Configure branching for preview environments

```typescript
// Future: packages/db/src/index.ts for Neon
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

---

## Related Stories

- **Story 1.1:** ✅ Initialize Better-T-Stack Project
- **Story 1.3:** Configure Cloudflare R2 Storage (next)
- **Story 1.4:** Set Up Environment Configuration
