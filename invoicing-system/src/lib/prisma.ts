import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as typeof globalThis & {
  prisma?: PrismaClient;
};

function makePrismaClient() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL environment variable.");
    // Don't throw here to allow the app to start with clearer logging later.
  }

  try {
    // Provide explicit options to avoid runtime initialization issues
    return new PrismaClient({
      log: ["warn", "error"],
    });
  } catch (err) {
    console.error("Error constructing PrismaClient:", err);
    // Provide a clearer actionable message for the common Prisma v7 constructor error
    const msg = String((err as { message?: string })?.message ?? err);
    if (msg.includes('requires either "adapter" or "accelerateUrl"')) {
      console.error(
        "Prisma client was built with engine type 'client'. This runtime requires either an `adapter` or an `accelerateUrl` passed to the PrismaClient constructor.\n" +
          "Options to fix:\n" +
          "  - Provide a driver adapter when constructing PrismaClient (see Prisma v7 docs), e.g. new PrismaClient({ adapter: yourAdapter, ... }).\n" +
          "  - Use a generated client that targets the binary engine (downgrade @prisma/client to a compatible version) and re-generate the client.\n" +
          "  - Or configure and use an accelerateUrl (Prisma Data/Accelerate) if applicable.\n" +
          "For local development the fastest workaround is to use a Prisma client version that doesn't require an adapter (e.g. a 4.x client) or follow Prisma's migration guide to wire an adapter."
      );
    }
    throw err;
  }
}

export const prisma = globalForPrisma.prisma || makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
