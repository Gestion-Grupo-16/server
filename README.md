![Cover Image](portada-splitter.png)

Backend URL

```
https://server-y9uq.onrender.com
```

## Endpoints

### Users (/users)

- **POST** /

  - <span style="color:green">Crea un nuevo usuario</span>.
  - Body: { id: string , email: string, username: string }

- **PATCH** /

  - <span style="color:green">Actualiza el nombre de usuario</span>.
  - Body: { user_id: string, new_username: string }

- **GET** /:user_id

  - <span style="color:green">Obtiene la información de un usuario</span>.
  - Params: user_id

- **GET** /
  - <span style="color:green">Obtiene la información de usuarios que contienen userIndentification como username o email</span>.
  - Body: { user_identification: String }:

### Groups (/groups)

- **POST** /

  - <span style="color:green"> Crea un nuevo grupo </span>.
  - Body: { user_id: string, name: string, description: string }
  - Optional: description

- **POST** /members/:group_id/:user_id

  - <span style="color:green"> Agrega un usuario con la propiedad pending=true a un grupo ya existente </span>.

  - Params: user_id, group_id

- **PATCH** /members/:group_id/:user_id

  - <span style="color:green"> Acepta la invitación a un grupo, cambiando el estado de groupmember a pending=false </span>.
  - Params: user_id, group_id

- **GET** /members/:group_id

  - <span style="color:green"> Obtiene a los integrantes de un grupo </span>.
  - Params: group_id

- **GET** /member/:user_id

  - <span style="color:green"> Obtiene los grupos de un usuario </span>.
  - Params: user_id

- **PATCH** /:group_id

  - <span style="color:green"> Actualiza el nombre y la descripción de un grupo </span>.
  - Params: group_id
  - Body: {admin_id, new_name, new_description}
  - Optional: new_description, new_name

- **PATCH** /:group_id/:user_id

  - <span style="color:green">Modifica el admin del grupo </span>.
  - Params: group_id, user_id
  - Body: {new_admin_id}

- **DELETE** :group_id/:user_id

  - <span style="color:green"> Elimina a un usuario de un grupo </span>.
  - Params: group_id, user_id

## Ejecución

```
docker-compose up --build
```
