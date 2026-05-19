import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

const email = process.env.FILEBUCKET_ADMIN_EMAIL;
const password = process.env.FILEBUCKET_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("FILEBUCKET_ADMIN_EMAIL and FILEBUCKET_ADMIN_PASSWORD are required to seed the admin user.");
}

const passwordHash = await hash(password, 12);

await prisma.user.upsert({
  where: { email },
  update: { passwordHash },
  create: {
    email,
    name: "Filebucket Admin",
    passwordHash,
  },
});

await prisma.$disconnect();

console.log(`Seeded Filebucket admin user: ${email}`);
