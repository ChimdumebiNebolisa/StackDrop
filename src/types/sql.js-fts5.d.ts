declare module "sql.js-fts5" {
  import initSqlJs from "sql.js";
  export default initSqlJs;
}

declare module "sql.js-fts5/dist/sql-wasm.wasm?url" {
  const url: string;
  export default url;
}
