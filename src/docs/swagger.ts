import swaggerAutogen from "swagger-autogen";

//Swagger reads the swagger.json file and generates the API code
const outputFile = "./swagger_output.json";

//For endpoint when opening swaggerUI
const endpointsFiles = [__dirname + "/../routes/api.ts"];
console.log("Resolved path: ", __dirname + "/../routes/api.ts");

//API documentation consists of info, server, authorization, and register, login, activation account
//request scheme
const doc = {
  info: {
    version: "1.0.0",
    title: "Dokumentasi API Acara",
    description: "Dokumentasai API Acara",
  },
  servers: [
    {
      url: "http://localhost:4000/api",
      description: "Local Server",
    },
    {
      url: "https://saku-sehat-backend.vercel.app/api",
      description: "Deploy Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    schemas: {
      RegisterRequest: {
        fullname: "any",
        username: "any",
        email: "any",
        password: "any",
        confirmPassword: "any",
      },
      LoginRequest: {
        identifier: "any",
        password: "any",
      },
      ActivationRequest: {
        code: "abcdfg",
      },
    },
  },
};

//Display API Documentation via Swagger UI
swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);
