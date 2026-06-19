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

// 1. Seed or update the admin user
const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash },
  create: {
    email,
    name: "Filebucket Admin",
    passwordHash,
  },
});

console.log(`Seeded Filebucket admin user: ${email}`);

// 2. Seed reserved folders
const reservedFolders = [
  { name: "Notes", type: "NOTES_ROOT" },
  { name: "Quick Notes", type: "KEEP_ROOT" },
  { name: "Chat Channels", type: "CHAT_ROOT" },
];

const folderMap = {};

for (const folderSpec of reservedFolders) {
  let folder = await prisma.folder.findFirst({
    where: {
      userId: user.id,
      type: folderSpec.type,
    },
  });

  if (!folder) {
    folder = await prisma.folder.create({
      data: {
        name: folderSpec.name,
        type: folderSpec.type,
        userId: user.id,
        parentId: null,
      },
    });
  }
  folderMap[folderSpec.type] = folder;
}

console.log("Seeded reserved root folders.");

// 3. Seed a sample Keep Note in Quick Notes
const keepRoot = folderMap["KEEP_ROOT"];
const sampleKeepNote = await prisma.note.findFirst({
  where: {
    userId: user.id,
    folderId: keepRoot.id,
  },
});

if (!sampleKeepNote) {
  await prisma.note.create({
    data: {
      title: "Welcome to Quick Notes",
      body: "- [ ] Try creating a card\n- [x] Check this checkbox\n- [ ] Choose a custom card background color",
      userId: user.id,
      folderId: keepRoot.id,
      color: "bg-purple-950/40",
      isPinned: true,
    },
  });
  console.log("Seeded sample Keep note.");
}

// 4. Seed a sample Chat Channel under Chat Channels
const chatRoot = folderMap["CHAT_ROOT"];
let chatChannel = await prisma.folder.findFirst({
  where: {
    userId: user.id,
    parentId: chatRoot.id,
  },
});

if (!chatChannel) {
  chatChannel = await prisma.folder.create({
    data: {
      name: "#general",
      type: "GENERAL",
      userId: user.id,
      parentId: chatRoot.id,
    },
  });
  console.log("Seeded sample chat channel: #general");
}

// 5. Seed sample Chat Messages in the channel
const sampleMessageCount = await prisma.chatMessage.count({
  where: {
    folderId: chatChannel.id,
  },
});

if (sampleMessageCount === 0) {
  await prisma.chatMessage.createMany({
    data: [
      {
        content: "Hello! Welcome to your private Discord-style logging channel.",
        userId: user.id,
        folderId: chatChannel.id,
      },
      {
        content: "You can post quick text logs, hyperlinks, or upload game screenshots and attachments directly into this feed.",
        userId: user.id,
        folderId: chatChannel.id,
      },
    ],
  });
  console.log("Seeded sample chat messages.");
}

await prisma.$disconnect();
console.log("Database seeding completed.");
