import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import type {
  CreateAdminTableInput,
  UpdateAdminTableInput,
} from "../validators/admin-table.validator.js";
import { tables } from "../db/schema/tables.js";

export const getAdminTables = async () => {
  return db.select().from(tables).orderBy(tables.tableNumber);
};

export const createAdminTable = async (input: CreateAdminTableInput) => {
  const [existingTable] = await db
    .select({ id: tables.id })
    .from(tables)
    .where(eq(tables.tableNumber, input.tableNumber))
    .limit(1);

  if (existingTable) {
    throw new Error("TABLE_NUMBER_EXISTS");
  }

  const [createdTable] = await db
    .insert(tables)
    .values({
      tableNumber: input.tableNumber,
      capacity: input.capacity,
      location: input.location,
      isActive: input.isActive ?? true,
    })
    .returning();

  if (!createdTable) {
    throw new Error("TABLE_CREATION_FAILED");
  }

  return createdTable;
};

export const updateAdminTable = async (
  tableId: string,
  input: UpdateAdminTableInput,
) => {
  const [existingTable] = await db
    .select()
    .from(tables)
    .where(eq(tables.id, tableId))
    .limit(1);

  if (!existingTable) {
    throw new Error("TABLE_NOT_FOUND");
  }

  if (input.tableNumber && input.tableNumber !== existingTable.tableNumber) {
    const [tableWithSameNumber] = await db
      .select({
        id: tables.id,
      })
      .from(tables)
      .where(eq(tables.tableNumber, input.tableNumber))
      .limit(1);

    if (tableWithSameNumber) {
      throw new Error("TABLE_NUMBER_EXISTS");
    }
  }

  const [updatedTable] = await db
    .update(tables)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(tables.id, tableId))
    .returning();

  if (!updatedTable) {
    throw new Error();
  }

  return updatedTable;
};
