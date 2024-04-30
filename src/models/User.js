import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";


export const User = sequelize.define(
  "users",
  {
    email: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
    },
  },
  { timestamps: false },
);