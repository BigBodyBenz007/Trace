import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import {
  STORAGE_DOMAIN_CLASSIFICATION,
  TRACE_BACKUP_STORAGE_KEYS,
  TRACE_RECOVERABLE_TRANSACTION_KEYS,
  TRACE_STORAGE_DOMAIN_MANIFEST,
  unclassifiedStorageKeys,
} from "./storageDomainManifest";

const SOURCE_ROOT = path.resolve(__dirname, "..");
const REPOSITORY_ROOT = path.resolve(SOURCE_ROOT, "..");
const STORAGE_METHODS = new Set(["getItem", "setItem", "removeItem"]);

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(location);
    if (!/\.(js|jsx)$/.test(entry.name) || /\.test\.(js|jsx)$/.test(entry.name)) return [];
    return [location];
  });
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  Object.entries(node).forEach(([key, value]) => {
    if (["loc", "start", "end"].includes(key)) return;
    if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
    else walk(value, visit);
  });
}

function literalValue(node) {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

function localStorageKeysInSource() {
  const keys = new Set();
  sourceFiles(SOURCE_ROOT).forEach((filename) => {
    if (filename.endsWith(`${path.sep}storageDomainManifest.js`)) return;
    const ast = parse(fs.readFileSync(filename, "utf8"), {
      sourceType: "module",
      plugins: ["jsx"],
    });
    const bindings = new Map();
    walk(ast, (node) => {
      if (node.type !== "VariableDeclarator" || node.id?.type !== "Identifier") return;
      const value = literalValue(node.init);
      if (value !== null) bindings.set(node.id.name, value);
    });
    walk(ast, (node) => {
      if (
        node.type === "VariableDeclarator" &&
        node.id?.type === "Identifier" &&
        /(?:STORAGE|TRANSACTION)_KEY$/.test(node.id.name)
      ) {
        const value = literalValue(node.init);
        if (value !== null) keys.add(value);
      }
      if (
        node.type !== "CallExpression" ||
        node.callee?.type !== "MemberExpression" ||
        !STORAGE_METHODS.has(node.callee.property?.name)
      ) return;
      const argument = node.arguments[0];
      const value = literalValue(argument) ?? (
        argument?.type === "Identifier" ? bindings.get(argument.name) : null
      );
      if (value) keys.add(value);
    });
  });
  const indexHtml = fs.readFileSync(path.join(REPOSITORY_ROOT, "public", "index.html"), "utf8");
  [...indexHtml.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(["']([^"']+)["']/g)]
    .forEach(([, key]) => keys.add(key));
  return keys;
}

function assignedString(source, name) {
  const match = new RegExp(`const\\s+${name}\\s*=\\s*["']([^"']+)["']`).exec(source);
  if (!match) throw new Error(`Could not discover ${name}.`);
  return match[1];
}

function discoveredPersistentKeys() {
  const keys = localStorageKeysInSource();
  const photoStorage = fs.readFileSync(path.join(SOURCE_ROOT, "storage", "photoStorage.js"), "utf8");
  const database = assignedString(photoStorage, "DATABASE_NAME");
  keys.add(`${database}/${assignedString(photoStorage, "PHOTO_STORE")}/*`);
  keys.add(`${database}/${assignedString(photoStorage, "MIGRATION_STORE")}/${assignedString(photoStorage, "LEGACY_MIGRATION_KEY")}`);
  const serviceWorker = fs.readFileSync(path.join(REPOSITORY_ROOT, "public", "service-worker.js"), "utf8");
  keys.add(`${assignedString(serviceWorker, "CACHE_PREFIX")}*`);
  return keys;
}

test("classifies every persistence key discovered in Trace source exactly once", () => {
  const manifestKeys = TRACE_STORAGE_DOMAIN_MANIFEST.map(({ key }) => key);
  expect(new Set(manifestKeys).size).toBe(manifestKeys.length);
  expect([...discoveredPersistentKeys()].sort()).toEqual([...manifestKeys].sort());
});

test("an introduced persistence key fails until it is explicitly classified", () => {
  expect(unclassifiedStorageKeys(["futureDurableDomain"])).toEqual(["futureDurableDomain"]);
  expect(unclassifiedStorageKeys(TRACE_STORAGE_DOMAIN_MANIFEST.map(({ key }) => key))).toEqual([]);
});

test("derives backup and recovery lists from manifest classifications", () => {
  const durableLocalStorage = TRACE_STORAGE_DOMAIN_MANIFEST
    .filter(({ storage, classification }) =>
      storage === "localStorage" && classification === STORAGE_DOMAIN_CLASSIFICATION.DURABLE_BACKUP
    )
    .map(({ key }) => key);
  const recoveryLocalStorage = TRACE_STORAGE_DOMAIN_MANIFEST
    .filter(({ storage, classification }) =>
      storage === "localStorage" &&
      classification === STORAGE_DOMAIN_CLASSIFICATION.TRANSACTION_RECOVERY_EXCLUDED
    )
    .map(({ key }) => key);
  expect(TRACE_BACKUP_STORAGE_KEYS).toEqual(durableLocalStorage);
  expect(TRACE_RECOVERABLE_TRANSACTION_KEYS).toEqual(recoveryLocalStorage);
  expect(TRACE_STORAGE_DOMAIN_MANIFEST.filter(({ backupLocation }) => backupLocation))
    .toHaveLength(TRACE_BACKUP_STORAGE_KEYS.length + 1);
  expect(TRACE_STORAGE_DOMAIN_MANIFEST.filter(({ classification }) =>
    classification !== STORAGE_DOMAIN_CLASSIFICATION.DURABLE_BACKUP
  ).every(({ backupLocation }) => backupLocation === null)).toBe(true);
});
