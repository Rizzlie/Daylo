# api-users-contracts

Internal `UserIdentity` port and runtime injection token for subject-based identity
lookup, email collision checks and admitted profile persistence. It exposes plain
types and opaque transaction contexts, without NestJS or Prisma dependencies.
Auth must lock incoming subject/email keys, check admission and save within the
same transaction. Runtime implementation belongs to Users data-access.
