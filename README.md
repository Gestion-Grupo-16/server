# Maestro Splitter API

API para la aplicacion Maestro Splitter.


URL
```
https://server-y9uq.onrender.com
```

## Endpoints

### Crear usuario

POST /users

Body

```
{
    "id": 1,
    "email": "usuario@example.com",
    "username": "usuario"
}
```

Ejemplo con curl

```
curl -X POST -H "Content-Type: application/json" -d '{"id": 1, "email": "usuario@example.com", "username": "usuario"}' http://localhost:8721/users
```

---

### Crear grupo

POST /groups

body:

```
{
    "user_id": 1,
    "name": "Nuevo grupo"
}

```

Ejemplo con curl

```
curl -X POST -H "Content-Type: application/json" -d '{"user_id": 1, "name": "Nuevo grupo"}' http://localhost:8721/groups
```

---

### Actualizar nombre de grupo

PATCH /groups/names/:group_id

Params

```
    group_id: id del grupo (entero)
```

Body

```
{
    "admin_id": 1,
    "new_group_name": "Nuevo nombre"
}
```

Ejemplo con curl

```
curl -X PATCH -H "Content-Type: application/json" -d '{"admin_id": 1, "new_group_name": "Nuevo nombre"}' http://localhost:3000/groups/names/1
```

---

## Ejecución

```
docker-compose up --build
```
