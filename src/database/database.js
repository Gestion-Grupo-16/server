import Sequelize from "sequelize";

const {
  POSTGRES_HOST: HOST,
  POSTGRES_USER: USER,
  POSTGRES_PASSWORD: PASSWORD,
  POSTGRES_DB: DB,
  POSTGRES_PORT: DB_PORT,
  POSTGRES_SSL: SSL,
} = process.env;

let dbOptions = {
  host: HOST,
  dialect: "postgres",
  port: DB_PORT,
  logging: false,
};

if (SSL.toLowerCase() === "true") {
  dbOptions.dialectOptions = {
    ssl: {
      require: true, // Require SSL connection
    },
  };
}

//export const sequelize = new Sequelize (DB,USER, PASSWORD, {
export const sequelize = new Sequelize(DB, USER, PASSWORD, dbOptions);