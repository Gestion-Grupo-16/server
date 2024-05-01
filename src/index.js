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
    
    const { user_id, name } = req.body;    
    const user = await User.findOne({ where: { id: user_id } });
    if (!user) {
        return res.status(404).send({ error: "User not found" });
    }        
    
    const group = await Group.create({name});
    if (!group) {
        return res.status(500).send({ error: "Error while creating group" });
    }

    const group_member= await GroupMember.create({group_id: group.id, user_id});
    if (!group_member) {
        return res.status(500).send({ error: "Error while creating group member" });
    }

    res.status(201).send({group_id, name})
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


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
