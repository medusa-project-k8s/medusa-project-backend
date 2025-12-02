# 🎯 MedusaJS Commands Cheat Sheet

## ▶️ START

```bash
# 1. Start Backend
cd /Users/efirshey/Documents/baremetal-projects/medusaJS/my-medusa-store
npm run docker:up

# 2. Start Storefront (wait 1 min after backend starts)
cd /Users/efirshey/Documents/baremetal-projects/medusaJS/my-medusa-store-storefront
npm run dev
```

**Open in browser:**
- Storefront: http://localhost:8000
- Admin: http://localhost:9000/app (admin@example.com / supersecret)

---

## ⏹️ STOP (Safe - Keeps Data)

```bash
# Stop Storefront
pkill -f "next dev"

# Stop Backend
cd /Users/efirshey/Documents/baremetal-projects/medusaJS/my-medusa-store
npm run docker:down
```

---

## 🗑️ STOP + DELETE ALL DATA

```bash
# Stop Storefront
pkill -f "next dev"

# Stop Backend + Delete Everything
cd /Users/efirshey/Documents/baremetal-projects/medusaJS/my-medusa-store
docker compose down -v
```

**⚠️ WARNING: This deletes all products, orders, customers!**

---

## ✅ CHECK STATUS

```bash
# Check Backend
docker compose ps

# Check Storefront
lsof -ti:8000
```

---

## 📋 VIEW LOGS

```bash
# Backend logs
docker compose logs -f medusa

# Last 100 lines
docker compose logs --tail=100 medusa
```

---

## 🔄 RESTART

```bash
# Restart Backend
npm run docker:down
npm run docker:up

# Restart Storefront
pkill -f "next dev"
npm run dev
```

---

## 🆘 EMERGENCY RESET

```bash
pkill -f "next dev"
docker compose down -v
docker system prune -af
npm run docker:up
```

**Deletes everything - use only if broken!**

