import { Express } from "express";
import SwaggerUI from "swagger-ui-express";
import SwaggerOutput from "./swagger_output.json";
import fs from "fs";
import path from "path";

//Exporting Swagger UI to index.ts
export default function docs(app: Express) {
  //Read the filesystem to get the path of swagger-ui.css
  const css = fs.readFileSync(
    path.resolve(
      __dirname,
      "../../node_modules/swagger-ui-dist/swagger-ui.css"
    ),
    "utf-8"
  );

  //middleware to export Swagger UI from swagger_ouput.json and its ui css from swagger-ui.css
  app.use(
    "/api-docs",
    SwaggerUI.serve,
    SwaggerUI.setup(SwaggerOutput, {
      customCss: css,
    })
  );
}
