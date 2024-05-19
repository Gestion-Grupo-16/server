import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Expense = sequelize.define(
  "expenses",
  {
    id : {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id : {
      type: DataTypes.INTEGER,
      foreignKey: true,
    },
    total_spent : {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    category : {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency : {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: false },
)