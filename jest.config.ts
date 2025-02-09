/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */
import type { Config } from "jest";
import { pathsToModuleNameMapper } from "ts-jest";
const config: Config = {
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "./tsconfig.test.json" }],
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!ffmpeg-stream)"],
  roots: ["<rootDir>/"],
  testMatch: ["**/spec/**/?(*.)+(spec|test).+(ts|js)"],
  testEnvironment: "node",
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "tsx", "js", "json", "css"],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(
      {
        "@src/*": ["./src/*"],
        "@app/*": ["./app/*"],
        "@shared/*": ["./shared/*"],
        "@utils/*": ["./utils/*"],
      },
      {
        prefix: "<rootDir>/",
      }
    ),
  },
};
export default config;
