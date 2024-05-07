import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Group = sequelize.define(
  "groups",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      unique: false,
    },
    //TODO add description
    admin_id: { 
      type:DataTypes.STRING,
      unique: false,
      foreignKey: true,
    }
  },
  { timestamps: false },
);

