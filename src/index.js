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

sequelize.sync({ force: true })

const validateCreateUser = [
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


app.get('/users', async (req, res) => {
    
    const user = await User.findAll().then(users => {
        return res.send(users);
    });

    if (!user) {
        return res.status(404).send({ error: "User not found" });
    }
        
});


app.post('/users',validateCreateUser , async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, username } = req.body;
    const newUser = await User.create({
      username,
      email,
    });
    
    if (!newUser) {
      return res.status(500).send({ error: "Error while creating user" });
    }

    res.status(201).send({username, email});

} );


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
