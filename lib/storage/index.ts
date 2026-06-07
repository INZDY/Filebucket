import { R2StorageAdapter } from "./r2-adapter";
export * from "./store";
export * from "./r2-adapter";
export const storageEngine = new R2StorageAdapter();
