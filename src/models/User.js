import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";
import { GroupMember } from "./GroupMember.js";


export const User = sequelize.define(
  "users",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    }
    ,
    username: {
      type: DataTypes.STRING,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: false,
    }
  },
  { timestamps: false },
);
