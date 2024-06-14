import express from "express";
import { body, param, validationResult } from "express-validator";
import { User } from "../models/User.js";
import { Op } from "sequelize";

const userRoutes = express.Router();


const validatePatchUser = [
    body("user_id")
    .notEmpty()
    .withMessage("User id is required")
    .bail()
    .isString()
    .withMessage("User id must be a String")
    .bail(),
    body("new_username")
    .notEmpty()
    .withMessage("New username is required")
    .bail()
    .isString()
    .withMessage("New username must be a String")
];

const validatePatchMPUser = [
  body("user_id")
  .notEmpty()
  .withMessage("User id is required")
  .bail()
  .isString()
  .withMessage("User id must be a String")
  .bail(),
  body("new_mp_alias")
  .notEmpty()
  .withMessage("New MP alias is required")
  .bail()
  .isString()
  .withMessage("New MP alias must be a String")
];


const validateCreateUser = [
    body("id")
      .notEmpty()
      .withMessage("Id is required")
      .bail()
      .isString()
      .withMessage("Id must be a String")
      .bail(),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .bail()
      .isEmail()
      .withMessage("Invalid Email")
      .bail(),
    body("username")
        .notEmpty()
        .withMessage("Username is required")
        .bail()
  ];


const validateGetUser = [
param("user_id")
    .notEmpty()
    .withMessage("Id is required")
    .bail()
    .isString()
    .withMessage("Id must be a String")
    .bail()  
];

const validateGetIdentification =[
param("user_identification")
    .notEmpty()
    .withMessage("Identification is required")
    .bail()
    .isString()
    .withMessage("Identification must be a String")
    .bail()  
]


userRoutes.post('/',validateCreateUser , async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // console.log("the body is ", req.body);
    const { id, email, username, firebase_token } = req.body;

    const mp_alias = req.body.mp_alias || undefined;
    
    if (mp_alias !== undefined && typeof mp_alias !== 'string') {
      return res.status(400).send({ error: "El Alias de MP debe ser un string" });
    }

    //si existe hay que chequear que sea unico en la bd
    if (mp_alias) {
      const mpAliasExists = await User.findOne({ where: { mp_alias } });
      if (mpAliasExists) {
        return res.status(409).send({ error: "El Alias de MP ya existe" });
      }
    }

    const idExists = await User.findOne({ where: { id } });

    if (idExists) {
      return res.status(409).send({ error: "El ID ya existe" });
    }
    
    const userExists = await User.findOne({ where: { username } });

    // TODO: los nombre si se pueden repetir
    if (userExists) {
      return res.status(409).send({ error: "El username ya existe" });
    }
    
    const newUser = await User.create({
      id,
      username,
      email,
      mp_alias,
      firebase_token,
    });
    
    if (!newUser) {
      return res.status(500).send({ error: "Error creando al usuario" });
    }

    res.status(201).send({id ,username, email, mp_alias, firebase_token});

} );

userRoutes.patch('/username', validatePatchUser, async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {user_id, new_username} = req.body;

  const userExists = await User.findOne({ where: { id:user_id } });

  if (!userExists) {
    return res.status(409).send({ error: "Usuario no encontrado" });
  }
  userExists.username = new_username
  try{
    await userExists.save();
  } catch (error) {
    return res.status(500).send({ error: "Fallo al actualizar el usuario" });
  }
  
  return res.status(200).send({ message: "El usuario se actualizo exitosamente" });

});

userRoutes.patch('/mp_alias', validatePatchMPUser, async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {user_id, new_mp_alias} = req.body;

  const userExists = await User.findOne({ where: { id:user_id } });

  if (!userExists) {
    return res.status(409).send({ error: "Usuario no encontrado" });
  }
  userExists.mp_alias = new_mp_alias
  try{
    await userExists.save();
  } catch (error) {
    return res.status(500).send({ error: "Fallo al actualizar el alias" });
  }
  
  return res.status(200).send({ message: "El alias se actualizo exitosamente" });

});

userRoutes.get('/:user_id',validateGetUser, async (req, res) => {
  // console.log("GET /users/:user_id");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const user_id = req.params.user_id;
  const user = await User.findOne({ where: { id: user_id } });

  if (!user) {
    return res.status(404).send({ error: "Usuario no encontrado" });
  }

  return res.status(200).json(user);
});



userRoutes.get('/identification/:user_identification', validateGetIdentification, async (req, res) => {
  // console.log("GET /users/identification/:user_identification");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const user_identification = req.params.user_identification;
  const users = await User.findAll({
    where: {
      [Op.or]: [
        { username: { [Op.like]: `%${user_identification}%` } },
        { email:{ [Op.like]: `%${user_identification}%` } }
      ]
    }
  });

  if (!users || users.length === 0) {
    return res.status(404).send([{ error: "Usuario no encontrado" }]);
  }

  return res.status(200).json(users);
});



userRoutes.delete('/:users/:user_id', async (req, res) => {
  const { user_id } = req.params
  
  try{
    await User.findOne({ where: { id:user_id } });
  }
  catch{
    return res.status(409).send({ error: "Usuario no encontrado" });
  }

  // Hay que borrar todos los Group Members que tiene del grupo

  // Buscar si el usuario es admin de algun grupo y si lo es asignar al azar un nuevo admin

  // Si es el último integrante del grupo, hay que eliminar también el grupo

  //return res.status(200).send({ message: 'User deleted'})
})

userRoutes.get('/firebase_token/:user_id', async (req, res) => {
  const { user_id } = req.params
  
  try{
    const user = await User.findOne({ where: { id:user_id } });
    if (user.firebase_token === null) {
      return res.status(409).send({ error: "Usuario no tiene un token asignado" });
    }
    return res.status(200).json(user.firebase_token);
  }
  catch{
    return res.status(409).send({ error: "Usuario no encontrado" });
  }
  
});

userRoutes.patch('/firebase_token/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { firebase_token } = req.body;
  console.log("user_id", user_id);  
  try {
    const user = await User.findOne({ where: { id: user_id } });
    if (!user) {
      console.error("Usuario no encontrado");
      return res.status(404).send({ error: "Usuario no encontrado" });
    }
    user.firebase_token = firebase_token;
    await user.save();
    return res.status(200).send({ message: 'Token actualizado correctamente'});
  } catch (err) {
    console.error("Error en la operación", err);
    return res.status(500).send({ error: "Error interno del servidor" });
  }
});

export  default userRoutes;