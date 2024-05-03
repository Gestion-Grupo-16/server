import express from "express";
import cors from "cors";
import { body, validationResult } from "express-validator";
import { sequelize } from "./database/database.js";
import "./models/User.js";
import "./models/Group.js";
import "./models/GroupMember.js";
import "./models/associations.js";

import { User } from "./models/User.js";
import { Group } from "./models/Group.js";
import { GroupMember } from "./models/GroupMember.js";

// sequelize.sync({ force: true })

const validateCreateUser = [
    body("id")
      .notEmpty()
      .withMessage("Id is required")
      .bail()
      .isInt()
      .withMessage("Id must be an integer")
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
  
const app = express();
const port = 8721;

app.use(cors());
app.use(express.json());


app.post('/groups', async (req, res) => {
    
    const { user_email, name } = req.body;    

    const user = await User.findOne({ where: { email: user_email } });
    if (!user) {
        return res.status(404).send({ error: "User not found" });
    }  

    const user_id = user.id
        
    // Verifico si el usuario ya tiene un grupo con el mismo nombre
    const existingGroup = await Group.findOne({
      where: { name },
      include: [{
          model: GroupMember,
          where: { user_id }
      }]
    });
    if (existingGroup) {
        return res.status(409).send({ error: "Group with this name already exists for this user" });
    }

    const group = await Group.create({name});
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

app.patch('/groups', async (req, res) => {
  
    const { user_email, group_name, new_user_email,  new_group_name} = req.body;    

    const user = await User.findOne({ where: { email: user_email } });
    if (!user) {
        return res.status(404).send({ error: "User not found" });
    }  

    const user_id = user.id

    const group = await Group.findOne({ where: { name: group_name } });
    if (!user) {
        return res.status(404).send({ error: "Group not found" });
    }  

    const group_id = group.id

    // Verifico si existe un miembro de grupo con los IDs proporcionados
    const existingGroupMember = await GroupMember.findOne({ where: { group_id, user_id } });
    if (!existingGroupMember) {
        return res.status(404).send({ error: "Group member not found" });
    }

    // Actualizo el nombre del grupo
    if (new_group_name != null){
      try {
        await group.update({ name: new_group_name });
        return res.status(200).send({ message: "Group name updated successfully" });
      } catch (error) {
          return res.status(500).send({ error: "Failed to update group name" });
      }
    }

    if (new_user_email != null){

      const new_member = await User.findOne({ where: { email: new_user_email } });
      if (!new_member) {
          return res.status(404).send({ error: "User not found" });
      }  
      const new_member_id = new_member.id

      const newGroupMember = await GroupMember.findOne({ where: { group_id, user_id : new_member_id } });
      if (newGroupMember) {
          return res.status(404).send({ error: "Group member already exists" });
      }
      else{
        const group_member = await GroupMember.create({group_id, user_id: new_member_id});
        if (!group_member) {
            return res.status(500).send({ error: "Error while creating group member" });
        }
        else{
          return res.status(200).send({ message: "Group member added successfully" });
        }
      }
      // res.status(201).send({ message: "Group successfully created" });
    }
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
