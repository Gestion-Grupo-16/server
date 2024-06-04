import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";


export const Payment = sequelize.define(
  "payments",
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
    creditor_id : {
      type: DataTypes.STRING,
      allowNull: false,
    },
    debtor_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    creation_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
  },
  { timestamps: false },
)