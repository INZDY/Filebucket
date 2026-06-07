import { VaultNamespaceManager } from "./manager";
import { PrismaVaultNamespaceStore } from "./prisma-store";

export * from "./types";
export * from "./store";
export * from "./manager";
export * from "./prisma-store";

const prismaStore = new PrismaVaultNamespaceStore();
export const namespaceManager = new VaultNamespaceManager(prismaStore);
