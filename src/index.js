import express from "express";
import cors from "cors";
import { body, param, validationResult } from "express-validator";
import { sequelize } from "./database/database.js";
import "./models/User.js";
import "./models/Group.js";
import "./models/GroupMember.js";
import "./models/associations.js";

import userRoutes from "./routes/userRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";

// sequelize.sync({ force: true })
  
const app = express();
const port = 8721;

app.use(cors());
app.use(express.json());
app.use('/users', userRoutes);
app.use('/groups', groupRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


