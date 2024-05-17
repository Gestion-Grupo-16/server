import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";


export const GroupMember = sequelize.define(
  "group_members",
  {
    group_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      foreignKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      foreignKey: true,
      unique: false,
    },
    pending:{
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  },
  { timestamps: false },
);

