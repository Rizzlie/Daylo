# api-groups-contracts

Internal `InvitationAdmission` port and runtime injection token. Auth can check for
an eligible invitation by normalized email and time in an opaque transaction,
without reading group data or importing Groups runtime code. No framework or Prisma
types are exposed.
