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
    const { id, email, username } = req.body;
    
    const idExists = await User.findOne({ where: { id } });

    if (idExists) {
      return res.status(409).send({ error: "ID already exists" });
    }
    
    const userExists = await User.findOne({ where: { username } });

    // TODO: los nombre si se pueden repetir
    if (userExists) {
      return res.status(409).send({ error: "Username already exists" });
    }
    
    const newUser = await User.create({
      id,
      username,
      email,
    });
    
    if (!newUser) {
      return res.status(500).send({ error: "Error while creating user" });
    }

    res.status(201).send({id ,username, email});

} );

userRoutes.patch('/', validatePatchUser, async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {user_id, new_username} = req.body;

  const userExists = await User.findOne({ where: { id:user_id } });

  if (!userExists) {
    return res.status(409).send({ error: "User not found" });
  }
  userExists.username = new_username
  try{
    await userExists.save();
  } catch (error) {
    return res.status(500).send({ error: "Failed to update user" });
  }
  
  return res.status(200).send({ message: "User updated successfully" });

});


userRoutes.get('/:user_id',validateGetUser, async (req, res) => {
  console.log("GET /users/:user_id");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const user_id = req.params.user_id;
  const user = await User.findOne({ where: { id: user_id } });

  if (!user) {
    return res.status(404).send({ error: "User not found" });
  }

  return res.status(200).json(user);
});



userRoutes.get('/identification/:user_identification', validateGetIdentification, async (req, res) => {
  console.log("GET /users/identification/:user_identification");
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
    return res.status(404).send([{ error: "User not found" }]);
  }

  return res.status(200).json(users);
});



userRoutes.delete('/:users/:user_id', async (req, res) => {
  const { user_id } = req.params
  
  try{
    await User.findOne({ where: { id:user_id } });
  }
  catch{
    return res.status(409).send({ error: "User not found" });
  }

  // Hay que borrar todos los Group Members que tiene del grupo

  // Buscar si el usuario es admin de algun grupo y si lo es asignar al azar un nuevo admin

  // Si es el último integrante del grupo, hay que eliminar también el grupo

  //return res.status(200).send({ message: 'User deleted'})
})


export  default userRoutes;