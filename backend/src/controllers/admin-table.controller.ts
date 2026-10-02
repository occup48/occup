import type { Request, Response } from "express";
import { z } from "zod";

import {
  createAdminTable,
  getAdminTables,
  updateAdminTable,
} from "../services/admin-table.service.js";

import {
  createAdminTableSchema,
  updateAdminTableSchema,
} from "../validators/admin-table.validator.js";

export const getTables = async (req: Request, res: Response) => {
  try {
    const data = await getAdminTables();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get admin tables error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch tables",
    });
  }
};

export const createTable = async (req: Request, res: Response) => {
  const result = createAdminTableSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid table data",
      errors: z.treeifyError(result.error),
    });
  }

  try {
    const table = await createAdminTable(result.data);

    return res.status(201).json({
      success: true,
      message: "Table created successfully",
      data: table,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TABLE_NUMBER_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A table with this number already exists",
      });
    }

    console.error("Create admin table error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create table",
    });
  }
};

export const updateTable = async (req: Request, res: Response) => {
  const rawTableId = req.params.id;

  const tableId = Array.isArray(rawTableId) ? rawTableId[0] : rawTableId;

  if (!tableId) {
    return res.status(400).json({
      success: false,
      message: "Table ID is required",
    });
  }

  const result = updateAdminTableSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid table data",
      errors: z.treeifyError(result.error),
    });
  }

  try {
    const table = await updateAdminTable(tableId, result.data);

    return res.status(200).json({
      success: true,
      message: "Table updated successfully",
      data: table,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TABLE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }

      if (error.message === "TABLE_NUMBER_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "A table with this number already exists",
        });
      }
    }

    console.error("Update admin table error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update table",
    });
  }
};
