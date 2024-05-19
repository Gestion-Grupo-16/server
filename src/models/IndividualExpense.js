import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const IndividualExpense = sequelize.define(
  "individualExpense",
  {
    expense_id : {
      type: DataTypes.INTEGER,
      primaryKey: true,
      foreignKey: true,
    },
    user_id : {
      type: DataTypes.STRING,
      primaryKey: true,
      foreignKey: true,
    },
    group_id : {
      type: DataTypes.INTEGER,
      foreignKey: true,
    },
    total_payed : {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    total_owed : {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  { timestamps: false },
)