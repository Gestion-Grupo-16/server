![Cover Image](portada-splitter.png)

Backend URL

```
https://server-y9uq.onrender.com
```

## Endpoints

### Users (/users)

- **POST** /

  - Crea un nuevo usuario
  - Body: { id: string , email: string, username: string }

- **PATCH** /

  - Actualiza el nombre de usuario
  - Body: { user_id: string, new_username: string }

- **GET** /:user_id
  - Obtiene la información de un usuario
  - Params: user_id

### Groups (/groups)

- **POST** /

  - Crea un nuevo grupo
  - Body: { user_id: string, name: string, description: string }
  - Optional: description

- **POST** /:group_id/:user_id

  - Agrega un usuario a un grupo ya existente
  - Params: user_id, group_id

- **GET** /members/:group_id

  - Obtiene a los integrantes de un grupo
  - Params: group_id

- **GET** /member/:user_id

  - Obtiene los grupos de un usuario
  - Params: user_id

- **PATCH** /:group_id
  - Actualiza el nombre y la descripción de un grupo
  - Params: group_id
  - Body: {admin_id, new_name, new_description}
  - Optional: new_description, new_name

- **DELETE** :group_id/:user_id
  - Elimina a un usuario de un grupo
  - Params: group_id, user_id

## Ejecución

```
docker-compose up --build
```
