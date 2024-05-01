import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";


export const Group = sequelize.define(
  "groups",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: false,
    },
  },
  { timestamps: false },
);

