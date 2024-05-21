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

- **GET** /identification/:user_identification
  - <span style="color:green">Obtiene la información de usuarios que contienen userIndentification como username o email</span>.
  - Params: user_identification

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

- **DELETE** /members/:group_id/:user_id

  - <span style="color:green"> Rechaza la invitación a un grupo, eliminando al integrante del grupo junto a pending=true </span>.
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

### Expenses (/expenses)

- **POST** /:group_id

  - <span style="color:green"> Crea un nuevo gasto </span>.
  - Params: group_id
  - Body: {  total_spent: float, category: String, currency: String, participants: Array<Hash> }
  - Array de participants: [ {"user_id": "id_user1", "spent": 100, "paid": 200}, ... ]

- **GET** /:group_id

  - <span style="color:green"> Obtiene los gastos de un grupo </span>.
  - Params: group_id

- **GET** /individual/:group_id

  - <span style="color:green"> Obtiene los gastos individuales de un grupo </span>.
  - Params: group_id

- **GET** /options/categories

  - <span style="color:green"> Obtiene las categorias a las que puede pertenecer un gasto </span>.
  - Params: -

- **GET** /options/currencies

  - <span style="color:green"> Obtiene las monedas en las que puede estar expresado un gasto </span>.
  - Params: -

### Debts (/debts)

- **POST** /

  - <span style="color:green"> Crea una nueva deuda cada vez que se agrega un usuario a un grupo </span>.
  - Params: group_id, new_group_member


## Ejecución

```
docker-compose up --build
```
