import express from "express";
import cors from "cors";
import { body, param, validationResult } from "express-validator";
import { sequelize } from "./database/database.js";
import "./models/User.js";
import "./models/Group.js";
import "./models/GroupMember.js";
import "./models/Expense.js";
import "./models/IndividualExpense.js";
import "./models/Debts.js";
import "./models/associations.js";
import "./models/Payments.js";

import userRoutes from "./routes/userRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import debtsRoutes from "./routes/debtsRoutes.js";

// sequelize.sync({ force: true })
  
const app = express();
const port = 8721;

app.use(cors());
app.use(express.json());
app.use('/users', userRoutes);
app.use('/groups', groupRoutes);
app.use('/expenses', expenseRoutes);
app.use('/debts', debtsRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


