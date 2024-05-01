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
      type: DataTypes.INTEGER,
      primaryKey: true,
      foreignKey: true,
      unique: false,
    },
  },
  { timestamps: false },
);

