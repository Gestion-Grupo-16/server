import express from "express";
import cors from "cors";
import { body, param, validationResult } from "express-validator";
import { sequelize } from "./database/database.js";
import "./models/User.js";
import "./models/Group.js";
import "./models/GroupMember.js";
import "./models/associations.js";

import { User } from "./models/User.js";
import { Group } from "./models/Group.js";
import { GroupMember } from "./models/GroupMember.js";

sequelize.sync({ force: true })

const validateCreateUser = [
    body("id")
      .notEmpty()
      .withMessage("Id is required")
      .bail()
      .isString()
      .withMessage("Id must be an String")
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

const validatePatchGroupName = [
    param("group_id")
      .notEmpty()
      .withMessage("Group id is required")
      .bail()
      .isInt()
      .withMessage("Group Id must be an integer")
      .bail(),
    body("admin_id")
      .notEmpty()
      .withMessage("Admin id is required")
      .bail()
      .isString()
      .withMessage("Admin Id must be an integer")
      .bail(),
    body("new_group_name")
      .notEmpty()
      .withMessage("New group name is required")
      .isAscii()
      .bail()
]

const validateGetGroupsOfUser = [
    param("user_id")
      .notEmpty()
      .withMessage("User id is required")
      .bail()
      .isInt()
      .withMessage("User Id must be an integer")
      .bail()
]

const validateGetGroupMembers = [
    param("group_id")
      .notEmpty()
      .withMessage("Group id is required")
      .bail()
      .isInt()
      .withMessage("Group Id must be an integer")
      .bail()
]

  
const app = express();
const port = 8721;

app.use(cors());
app.use(express.json());


app.post('/groups', async (req, res) => {
    
    const { user_id, name } = req.body;    

    const description = req.body.description || 'Group ${name}';

    const user = await User.findOne({ where: { id: user_id } });
    if (!user) {
        return res.status(404).send({ error: "User not found" });
    }  
    
    const group = await Group.create({name: name, admin_id: user_id, description: description});
    if (!group) {
        return res.status(500).send({ error: "Error while creating group" });
    }

    const group_member= await GroupMember.create({group_id: group.id, user_id});
    if (!group_member) {
        return res.status(500).send({ error: "Error while creating group member" });
    }

    res.status(201).send({ message: "Group successfully created" });
    // res.status(201).send({group_id, name})


});

app.patch('/groups/admin/:group_id', async (req, res) => {
});
// Todo send all the data, not only group name.
app.patch('/groups/names/:group_id', validatePatchGroupName ,async (req, res) => {
  
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }  
    const {admin_id, new_group_name} = req.body;
    const group_id = req.params.group_id;
    
    const group_admin_id = await Group.findOne({ where: { id: group_id } });
    if (!group_admin_id) {
        return res.status(404).send({ error: "Group not found" });
    }

    if (group_admin_id.admin_id != admin_id){
        return res.status(403).send({ error: "You are not the admin of this group" });
    }
    
    try {
      await Group.update({name: new_group_name}, {where: {id: group_id}})
    }
    catch (e) {
      return res.status(500).send({ error: "Error while updating group name" });
    }

    return res.status(200).send({ message: "Group name updated successfully" });
});

app.get('/groups/member/:user_id', validateGetGroupsOfUser , async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user_id = req.params.user_id;
    const user_groups = await GroupMember.findAll({ where: { user_id } });
    
    if (!user_groups) {
      return res.status(404).send({ error: "User has no groups" });
    }

    const groups_info_promises = user_groups.map(group => {
      return Group.findOne({ where: { id: group.group_id } });
    });

    const groups_info = await Promise.all(groups_info_promises);

    return res.status(200).json(groups_info);
});

app.get('/group-members/:group_id', validateGetGroupMembers, async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const group_id = req.params.group_id;
    const group_members = await GroupMember.findAll({ where: { group_id } });
    
    if (!group_members) {
      return res.status(404).send({ error: "Group has no members" });
    }

    const members_info_promises = group_members.map(member => {
      return User.findOne({ where: { id: member.user_id } });
    });

    const members_info = await Promise.all(members_info_promises);

    return res.status(200).json(members_info);
});

app.post('/users',validateCreateUser , async (req,res) => {
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

app.patch('/users', async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { current_email, new_email, new_username } = req.body;

  // Verifico que al menos uno de los nuevos datos ha sido proporcionado
  if ( !new_email && !new_username) {
    return res.status(400).send({ error: "No new data provided for update" });
  }
  else if (!current_email){
    return res.status(400).send({ error: "No user data provided for update" });
  }

  // Busco el usuario por el email actual
  const userExists = await User.findOne({ where: { email: current_email } });

  if (!userExists) {
    return res.status(409).send({ error: "User not found" });
  }

  // Preparo el objeto con las actualizaciones
  const updateData = {};
  if (new_email) {
    updateData.email = new_email;
  }
  if (new_username) {
    updateData.username = new_username;
  }

  // Actualizo el objeto
  try {
    await userExists.update(updateData);
    return res.status(200).send({ message: "User updated successfully" });
  } catch (error) {
    // Capturar y manejar errores posibles durante la actualización
    return res.status(500).send({ error: "Failed to update user" });
  }
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
